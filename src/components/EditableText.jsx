import { lazy, Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import { useSite } from '../lib/site'
import { splitTokens } from '../lib/variables'
import { renderRichText, richTextIsEmpty } from '../lib/richText'
import EditErrorBoundary from './EditErrorBoundary.jsx'
import { OPEN_VARIABLE_PICKER, caretIn, caretRect, renderEditable, serializeEditable } from './editableDom'

// Formatted-text editor (Tiptap + MUI toolbar), loaded the first time edit mode is used.
const RichTextField = lazy(() => import('../admin/richtext/RichTextField.jsx'))

/**
 * A piece of page text that can be edited in place while edit mode is on.
 *
 *   <EditableText id="home.hero.title" as="h1">Seasonal food, made with care</EditableText>
 *
 * `id` must be unique across the site; it's the key the text is saved under.
 * The children are the default text, shown until someone saves an edit.
 * Set `multiline` for paragraph text: it becomes a formatted-text field (bold, italic, links,
 * lists…) stored as HTML and always rendered in a <div>. Pass rich={false} for multi-line
 * plain text instead. Otherwise Enter finishes editing.
 * `placeholder` is shown in edit mode while the field is empty.
 *
 * Text can contain site variables as {{key}} (e.g. {{address}}). Visitors see the variable's
 * value; in edit mode it shows as a chip. Type "{{" while editing to insert one.
 */
export default function EditableText({
  id,
  as: Tag = 'span',
  multiline = false,
  className,
  placeholder = 'Click to add text',
  rich = multiline,
  children,
}) {
  const { editing, getText, saveText, variables } = useSite()
  const fallback = typeof children === 'string' ? children : ''
  const value = getText(id, fallback)

  if (rich) {
    return (
      <RichText
        value={value}
        variables={variables}
        editing={editing}
        className={className}
        placeholder={placeholder}
        onSave={(next) => saveText(id, next).catch(() => {})}
      />
    )
  }

  const classes = [className, multiline && 'multiline'].filter(Boolean).join(' ') || undefined

  // Empty fields render nothing for visitors; in edit mode they show a placeholder.
  if (!editing) {
    if (!value) return null
    return <Tag className={classes}>{renderText(value, variables)}</Tag>
  }

  return (
    <EditingField
      Tag={Tag}
      className={[classes, 'editable'].filter(Boolean).join(' ')}
      value={value}
      variables={variables}
      multiline={multiline}
      placeholder={placeholder}
      onSave={(next) => saveText(id, next).catch(() => {})} // failure shows in the admin bar
    />
  )
}

function RichText({ value, variables, editing, className, placeholder, onSave }) {
  const html = useMemo(() => renderRichText(value, variables), [value, variables])
  const classes = [className, 'rich-text'].filter(Boolean).join(' ')
  const staticView = <div className={classes} dangerouslySetInnerHTML={{ __html: html }} />

  if (!editing) return richTextIsEmpty(value) ? null : staticView
  return (
    <EditErrorBoundary fallback={staticView}>
      <Suspense fallback={staticView}>
        <RichTextField
          value={value}
          variables={variables}
          className={className}
          placeholder={placeholder}
          onSave={onSave}
        />
      </Suspense>
    </EditErrorBoundary>
  )
}

/** Text with {{key}} tokens replaced by variable values (unknown variables render nothing). */
function renderText(text, variables) {
  const parts = splitTokens(text)
  if (parts.length === 1 && parts[0].text !== undefined) return text
  return parts.map((part, i) =>
    part.variable ? (
      <span key={i} className="var-value" data-var={part.variable}>
        {variables[part.variable]?.value ?? ''}
      </span>
    ) : (
      part.text
    ),
  )
}

function EditingField({ Tag, className, value, variables, multiline, placeholder, onSave }) {
  const ref = useRef(null)

  // The DOM owns the text while editing, so React doesn't render children here.
  // Re-render from the saved value (and current variable values) when not being typed in.
  useLayoutEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el) renderEditable(el, value, variables)
  }, [value, variables])

  function commit() {
    const el = ref.current
    // The variable picker briefly takes focus; don't save half-way through inserting.
    if (el.dataset.picking) return
    let next = serializeEditable(el)
    next = multiline ? next.replace(/\n+$/, '') : next.replace(/\s*\n\s*/g, ' ').trim()
    if (next !== value) onSave(next)
    else renderEditable(el, value, variables) // normalise any stray whitespace
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      ref.current.blur()
    } else if (e.key === 'Escape') {
      renderEditable(ref.current, value, variables)
      ref.current.blur()
    }
  }

  // Typing "{{" opens the variable picker at the caret.
  function handleInput() {
    const el = ref.current
    const range = caretIn(el)
    if (!range || !range.collapsed || range.startContainer.nodeType !== Node.TEXT_NODE) return
    const before = range.startContainer.nodeValue.slice(0, range.startOffset)
    if (!before.endsWith('{{')) return
    window.dispatchEvent(
      new CustomEvent(OPEN_VARIABLE_PICKER, {
        detail: { el, range: range.cloneRange(), rect: caretRect(range, el), removeBefore: 2 },
      }),
    )
  }

  return (
    <Tag
      ref={ref}
      className={className}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck
      role="textbox"
      aria-multiline={multiline || undefined}
      data-placeholder={placeholder}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      onInput={handleInput}
      // Keep clicks from following a surrounding link while editing.
      onClick={(e) => e.preventDefault()}
    />
  )
}
