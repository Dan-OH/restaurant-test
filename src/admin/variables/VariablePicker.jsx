import { useEffect, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Popover from '@mui/material/Popover'
import Snackbar from '@mui/material/Snackbar'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { OPEN_VARIABLE_PICKER, caretIn, caretRect, insertChip } from '../../components/editableDom'
import { useSite } from '../../lib/site'
import VariableDialog from './VariableDialog.jsx'
import { tokenFor } from '../../lib/variables'

/**
 * Variable tools for edit mode, mounted by AdminBar:
 *  - a popup for inserting a variable into the text field being edited. Opens when "{{" is
 *    typed in a field, or from the admin bar's "Insert variable" button;
 *  - clicking a variable chip in the page opens its settings (or "New variable" if missing).
 */
export default function VariablePicker() {
  const { variableList, variables } = useSite()
  // The field being edited ({ el, range, removeBefore }); a ref because it holds DOM nodes.
  const targetRef = useRef(null)
  const [anchor, setAnchor] = useState(null) // caret position while the picker is open
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [hint, setHint] = useState(null)
  const [dialog, setDialog] = useState(null) // { variable } or { initialKey } for a missing one

  useEffect(() => {
    function open(e) {
      let detail = e.detail
      if (detail.fromSelection) {
        // From the admin bar: use the caret in whichever field is being edited.
        const el = document.activeElement?.closest?.('.editable')
        const range = el && caretIn(el)
        if (!range) {
          setHint('Click into a piece of text first, then insert a variable.')
          return
        }
        detail = { el, range: range.cloneRange(), rect: caretRect(range, el), removeBefore: 0 }
      }
      detail.el.dataset.picking = '1' // stop the field saving while the picker has focus
      targetRef.current = detail
      setQuery('')
      setActive(0)
      setAnchor({ top: detail.rect.bottom + 6, left: detail.rect.left })
    }
    window.addEventListener(OPEN_VARIABLE_PICKER, open)
    return () => window.removeEventListener(OPEN_VARIABLE_PICKER, open)
  }, [])

  // Clicking a chip opens that variable's settings.
  useEffect(() => {
    function handleClick(e) {
      const chip = e.target.closest?.('.var-chip')
      if (!chip) return
      e.preventDefault()
      const variable = variables[chip.dataset.var]
      setDialog(variable ? { variable } : { initialKey: chip.dataset.var })
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [variables])

  const q = query.trim().toLowerCase()
  const matches = variableList
    .filter((v) => !q || [v.label, v.key, v.value].some((t) => t?.toLowerCase().includes(q)))
    .sort((a, b) => a.label.localeCompare(b.label))

  // Ends picking: lets the field save again and closes the popup. Returns the target.
  function finish() {
    const target = targetRef.current
    targetRef.current = null
    setAnchor(null)
    if (target) delete target.el.dataset.picking
    return target
  }

  function choose(variable) {
    const { el, range, removeBefore } = finish()
    insertChip(el, range, variable.key, variables, removeBefore)
  }

  function close() {
    const target = finish()
    if (!target) return
    const { el, range } = target
    // Return to the field where the user was typing.
    el.focus()
    const selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)
  }

  // Leaving for the Variables page: save the field as it is first.
  function leave() {
    const target = finish()
    if (!target) return
    target.el.focus()
    target.el.blur()
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (matches[active]) choose(matches[active])
    }
  }

  return (
    <>
      <Popover
        open={Boolean(anchor)}
        onClose={close}
        anchorReference="anchorPosition"
        anchorPosition={anchor ?? undefined}
        disableRestoreFocus
        slotProps={{ paper: { sx: { width: 340, maxWidth: 'calc(100vw - 32px)' } } }}
      >
        <Box sx={{ p: 1.5, pb: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Insert a variable
          </Typography>
          <TextField
            size="small"
            placeholder="Search variables…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={handleKeyDown}
            autoFocus
            fullWidth
            slotProps={{ htmlInput: { 'aria-label': 'Search variables' } }}
          />
        </Box>
        <List dense sx={{ maxHeight: 280, overflowY: 'auto', py: 0 }} role="listbox">
          {matches.map((v, i) => (
            <ListItemButton
              key={v.id}
              selected={i === active}
              onClick={() => choose(v)}
              onMouseEnter={() => setActive(i)}
              role="option"
              aria-selected={i === active}
            >
              <ListItemText
                primary={
                  <>
                    {v.label}{' '}
                    <Box component="code" sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {tokenFor(v.key)}
                    </Box>
                  </>
                }
                secondary={v.value}
                slotProps={{ secondary: { noWrap: true } }}
              />
            </ListItemButton>
          ))}
          {matches.length === 0 && (
            <Typography variant="body2" sx={{ color: 'text.secondary', px: 2, py: 1.5 }}>
              {variableList.length ? 'No variables match.' : 'No variables yet.'}
            </Typography>
          )}
        </List>
        <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider' }}>
          <Link component={RouterLink} to="/admin/variables" variant="body2" onClick={leave}>
            Manage variables
          </Link>
        </Box>
      </Popover>

      {dialog && (
        <VariableDialog
          key={dialog.variable?.id ?? `new-${dialog.initialKey}`}
          variable={dialog.variable ?? null}
          initialKey={dialog.initialKey}
          onClose={() => setDialog(null)}
        />
      )}

      <Snackbar
        open={Boolean(hint)}
        autoHideDuration={4000}
        onClose={() => setHint(null)}
        message={hint}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  )
}
