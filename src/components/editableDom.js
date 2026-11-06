import { splitTokens } from '../lib/variables'

/**
 * DOM helpers for in-place editing (EditableText) with variables shown as "chips":
 * non-editable inline elements that stand for a {{key}} token.
 */

export const CHIP_CLASS = 'var-chip'

// Window event that opens the variable picker (handled by src/admin/variables/VariablePicker.jsx).
// detail: { el, range, rect, removeBefore } from a field, or { fromSelection: true } from the admin bar.
export const OPEN_VARIABLE_PICKER = 'variables:open-picker'

/** Creates the chip element for a variable. */
export function createChip(key, variables) {
  const variable = variables[key]
  const chip = document.createElement('span')
  chip.className = variable ? CHIP_CLASS : `${CHIP_CLASS} is-missing`
  chip.setAttribute('contenteditable', 'false')
  chip.dataset.var = key
  chip.textContent = variable ? variable.value || '(empty)' : `Missing: ${key}`
  chip.title = variable
    ? `Variable: ${variable.label} ({{${key}}}). Change its value in Dashboard → Variables.`
    : `No variable called "${key}". Create it in Dashboard → Variables or delete this.`
  return chip
}

/** Fills an editable element from stored text: plain text, line breaks and variable chips. */
export function renderEditable(el, text, variables) {
  const nodes = []
  for (const part of splitTokens(text || '')) {
    if (part.variable) {
      nodes.push(createChip(part.variable, variables))
    } else {
      part.text.split('\n').forEach((line, i) => {
        if (i > 0) nodes.push(document.createElement('br'))
        if (line) nodes.push(document.createTextNode(line))
      })
    }
  }
  el.replaceChildren(...nodes)
}

/** Reads an editable element back into stored text, turning chips into {{key}} tokens. */
export function serializeEditable(el) {
  let out = ''
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.nodeValue
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.dataset.var) out += `{{${child.dataset.var}}}`
        else if (child.tagName === 'BR') out += '\n'
        else if (child.tagName === 'DIV' || child.tagName === 'P') {
          // Some browsers wrap new lines in blocks instead of using <br>.
          if (out && !out.endsWith('\n')) out += '\n'
          walk(child)
        } else walk(child)
      }
    }
  }
  walk(el)
  return out.replace(/ /g, ' ')
}

/**
 * Inserts a variable chip at `range` (inside an editable element), optionally deleting
 * `removeBefore` characters before it (the "{{" that opened the picker), and puts the
 * caret after the chip.
 */
export function insertChip(el, range, key, variables, removeBefore = 0) {
  el.focus()
  const r = range.cloneRange()
  if (removeBefore && r.startContainer.nodeType === Node.TEXT_NODE && r.startOffset >= removeBefore) {
    r.setStart(r.startContainer, r.startOffset - removeBefore)
    r.deleteContents()
  }
  const chip = createChip(key, variables)
  r.insertNode(chip)

  // A plain space after the chip gives the caret somewhere to go and keeps words apart.
  const space = document.createTextNode(' ')
  chip.after(space)
  const caret = document.createRange()
  caret.setStart(space, 1)
  caret.collapse(true)
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(caret)
}

/** The current caret range if it's inside `el`, else null. */
export function caretIn(el) {
  const selection = window.getSelection()
  if (!selection.rangeCount) return null
  const range = selection.getRangeAt(0)
  return el.contains(range.startContainer) ? range : null
}

/** Screen position for a popup at the caret (falls back to the element's corner). */
export function caretRect(range, el) {
  const rect = range.getBoundingClientRect()
  if (rect && (rect.top || rect.left)) return rect
  return el.getBoundingClientRect()
}
