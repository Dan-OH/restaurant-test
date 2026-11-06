import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extensions'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import DataObjectIcon from '@mui/icons-material/DataObject'
import FormatBoldIcon from '@mui/icons-material/FormatBold'
import FormatClearIcon from '@mui/icons-material/FormatClear'
import FormatItalicIcon from '@mui/icons-material/FormatItalic'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'
import FormatQuoteIcon from '@mui/icons-material/FormatQuote'
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined'
import InsertLinkIcon from '@mui/icons-material/InsertLink'
import TitleIcon from '@mui/icons-material/Title'
import { OPEN_VARIABLE_PICKER, createChip } from '../../components/editableDom'
import { stripVariableSpans, toHtml, tokensToSpans } from '../../lib/richText'
import AdminTheme from '../AdminTheme.jsx'
import { VariableNode, setChipVariables } from './VariableNode'

/**
 * In-place formatted-text editor (Tiptap) for paragraph fields in edit mode. Text keeps the
 * site's own styles; a small toolbar appears above the field while it's being edited.
 * Saves HTML on blur. Site variables work as in plain fields: type "{{" or use the admin bar.
 */
export default function RichTextField(props) {
  return (
    <AdminTheme>
      <RichTextEditor {...props} />
    </AdminTheme>
  )
}

function RichTextEditor({ value, variables, placeholder, className, onSave }) {
  setChipVariables(variables)
  const lastSaved = useRef(null) // HTML as last loaded/saved, to skip saves with no changes
  const [linkAnchor, setLinkAnchor] = useState(null)
  // Latest props for the editor's callbacks, which are set up once.
  const latest = useRef({ value, onSave })
  useEffect(() => {
    latest.current = { value, onSave }
  })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      Placeholder.configure({ placeholder }),
      VariableNode,
    ],
    content: tokensToSpans(toHtml(value)),
    editorProps: {
      attributes: {
        class: [className, 'rich-text', 'editable', 'editable-rich'].filter(Boolean).join(' '),
        'data-rich-editor': '',
        spellcheck: 'true',
      },
    },
    onCreate: ({ editor }) => {
      lastSaved.current = editorHtml(editor)
      // Expose insert/focus for the admin bar's "Insert variable" button (see VariablePicker).
      editor.view.dom.richApi = {
        insert: (key) => insertVariable(editor, key),
        focus: () => editor.commands.focus(),
        blur: () => editor.commands.blur(),
        caretRect: () => editor.view.coordsAtPos(editor.state.selection.from),
      }
    },
    onBlur: ({ editor }) => {
      const html = editorHtml(editor)
      if (html === lastSaved.current || (!html && !latest.current.value)) return
      lastSaved.current = html
      latest.current.onSave(html)
    },
    onUpdate: ({ editor }) => openPickerOnBraces(editor),
  })

  // Saved value changed elsewhere (e.g. a variable was renamed): reload unless being edited.
  useEffect(() => {
    if (!isLive(editor) || editor.isFocused) return
    if (value === lastSaved.current) return
    editor.commands.setContent(tokensToSpans(toHtml(value)), { emitUpdate: false })
    lastSaved.current = editorHtml(editor)
  }, [editor, value])

  // Variable values changed: refresh the chips' text.
  useEffect(() => {
    if (!isLive(editor)) return
    editor.view.dom.querySelectorAll('.var-chip[data-var]').forEach((chip) => {
      const fresh = createChip(chip.dataset.var, variables)
      chip.textContent = fresh.textContent
      chip.className = fresh.className
    })
  }, [editor, variables])

  const focused = useEditorState({ editor, selector: ({ editor }) => editor?.isFocused ?? false })

  return (
    <Box sx={{ position: 'relative' }}>
      {isLive(editor) && (focused || linkAnchor) && (
        <Toolbar editor={editor} onLink={(el) => setLinkAnchor(el)} />
      )}
      <EditorContent editor={editor} />
      {isLive(editor) && linkAnchor && <LinkPopover editor={editor} anchor={linkAnchor} onClose={() => setLinkAnchor(null)} />}
    </Box>
  )
}

// Whether the editor is attached to the page. Tiptap creates the editor before mounting it
// (and tears it down on unmount); most editor calls throw outside that window.
function isLive(editor) {
  return Boolean(editor && editor.isInitialized && !editor.isDestroyed)
}

// The editor's content as stored: '' when empty, with variable chips as {{key}} tokens.
function editorHtml(editor) {
  return editor.isEmpty ? '' : stripVariableSpans(editor.getHTML())
}

function insertVariable(editor, key, removeBefore = 0) {
  const { from } = editor.state.selection
  editor
    .chain()
    .focus()
    .deleteRange({ from: from - removeBefore, to: from })
    .insertContent([
      { type: 'variable', attrs: { key } },
      { type: 'text', text: ' ' },
    ])
    .run()
}

// Typing "{{" opens the variable picker at the caret.
function openPickerOnBraces(editor) {
  const { from, empty } = editor.state.selection
  if (!empty || from < 2) return
  if (editor.state.doc.textBetween(from - 2, from) !== '{{') return
  window.dispatchEvent(
    new CustomEvent(OPEN_VARIABLE_PICKER, {
      detail: {
        rect: editor.view.coordsAtPos(from),
        api: {
          insert: (key) => insertVariable(editor, key, 2),
          focus: () => editor.commands.focus(),
          blur: () => editor.commands.blur(),
        },
      },
    }),
  )
}

function Toolbar({ editor, onLink }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      link: editor.isActive('link'),
      heading: editor.isActive('heading', { level: 3 }),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      blockquote: editor.isActive('blockquote'),
    }),
  })
  const chain = () => editor.chain().focus()

  const buttons = [
    { key: 'bold', label: 'Bold (Ctrl+B)', icon: <FormatBoldIcon />, run: () => chain().toggleBold().run() },
    { key: 'italic', label: 'Italic (Ctrl+I)', icon: <FormatItalicIcon />, run: () => chain().toggleItalic().run() },
    { key: 'underline', label: 'Underline (Ctrl+U)', icon: <FormatUnderlinedIcon />, run: () => chain().toggleUnderline().run() },
    { key: 'link', label: 'Link', icon: <InsertLinkIcon />, run: (e) => onLink(e.currentTarget) },
    'divider',
    { key: 'heading', label: 'Subheading', icon: <TitleIcon />, run: () => chain().toggleHeading({ level: 3 }).run() },
    { key: 'bulletList', label: 'Bulleted list', icon: <FormatListBulletedIcon />, run: () => chain().toggleBulletList().run() },
    { key: 'orderedList', label: 'Numbered list', icon: <FormatListNumberedIcon />, run: () => chain().toggleOrderedList().run() },
    { key: 'blockquote', label: 'Quote', icon: <FormatQuoteIcon />, run: () => chain().toggleBlockquote().run() },
    'divider',
    {
      key: 'variable',
      label: 'Insert variable',
      icon: <DataObjectIcon />,
      run: () =>
        window.dispatchEvent(new CustomEvent(OPEN_VARIABLE_PICKER, { detail: { fromSelection: true } })),
    },
    { key: 'clear', label: 'Clear formatting', icon: <FormatClearIcon />, run: () => chain().unsetAllMarks().clearNodes().run() },
  ]

  return (
    <Paper
      elevation={4}
      role="toolbar"
      aria-label="Text formatting"
      sx={{
        position: 'absolute',
        bottom: 'calc(100% + 6px)',
        left: 0,
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 0.25,
        p: 0.5,
        textAlign: 'left',
        textShadow: 'none',
      }}
    >
      {buttons.map((b, i) =>
        b === 'divider' ? (
          <Divider key={`d${i}`} orientation="vertical" flexItem sx={{ mx: 0.25 }} />
        ) : (
          <Tooltip key={b.key} title={b.label}>
            <IconButton
              size="small"
              aria-label={b.label}
              aria-pressed={state[b.key] ?? undefined}
              color={state[b.key] ? 'primary' : 'default'}
              sx={state[b.key] ? { bgcolor: 'action.selected' } : undefined}
              // Keep the editor focused (and its selection) when clicking toolbar buttons.
              onMouseDown={(e) => e.preventDefault()}
              onClick={b.run}
            >
              {b.icon}
            </IconButton>
          </Tooltip>
        ),
      )}
    </Paper>
  )
}

function LinkPopover({ editor, anchor, onClose }) {
  const [href, setHref] = useState(() => editor.getAttributes('link').href ?? '')
  const hasLink = editor.isActive('link')

  function apply(e) {
    e.preventDefault()
    const url = href.trim()
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
    onClose()
  }

  return (
    <Popover
      open
      anchorEl={anchor}
      onClose={() => {
        onClose()
        editor.commands.focus()
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    >
      <Box component="form" onSubmit={apply} sx={{ p: 1.5, width: 320, maxWidth: 'calc(100vw - 32px)' }}>
        <TextField
          size="small"
          label="Link address"
          placeholder="https://… or /menu"
          value={href}
          onChange={(e) => setHref(e.target.value)}
          autoFocus
          fullWidth
          helperText="Select text first to turn it into a link."
        />
        <Stack direction="row" spacing={1} sx={{ mt: 1, justifyContent: 'flex-end' }}>
          {hasLink && (
            <Button
              size="small"
              color="error"
              onClick={() => {
                editor.chain().focus().extendMarkRange('link').unsetLink().run()
                onClose()
              }}
            >
              Remove link
            </Button>
          )}
          <Button type="submit" size="small" variant="contained">
            {hasLink ? 'Update' : 'Add link'}
          </Button>
        </Stack>
      </Box>
    </Popover>
  )
}
