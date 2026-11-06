import DOMPurify from 'dompurify'

/**
 * Formatted ("rich") text fields store HTML produced by the editor (src/admin/richtext/).
 * Older values were plain text; they're converted on the fly. Site variables stay as plain
 * {{key}} tokens inside the HTML, so renaming/deleting variables works the same as in plain text.
 */

// Only formatting the editor can produce is allowed through to visitors.
const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'h3', 'blockquote']
const ALLOWED_ATTR = ['href', 'target', 'rel']

let hooked = false
function sanitizer() {
  if (!hooked) {
    // Links that open in a new tab must not give the new page access to this one.
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
        node.setAttribute('rel', 'noopener noreferrer')
      }
    })
    hooked = true
  }
  return DOMPurify
}

const TOKEN = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g

export function isHtml(value) {
  return /^\s*</.test(value || '')
}

export function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Plain text → HTML: blank lines separate paragraphs, single line breaks become <br>. */
export function plainToHtml(text) {
  if (!text) return ''
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/** A stored value as HTML (converting older plain-text values). */
export function toHtml(value) {
  return isHtml(value) ? value : plainToHtml(value)
}

/** Visible text of a value (for comparisons like "is it empty?"). */
export function richTextIsEmpty(value) {
  return !toHtml(value).replace(/<[^>]*>/g, '').trim()
}

/**
 * HTML safe to show visitors: sanitized, with {{key}} tokens replaced by variable values
 * (multi-line values keep their line breaks).
 */
export function renderRichText(value, variables) {
  const fragment = sanitizer().sanitize(toHtml(value), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    RETURN_DOM_FRAGMENT: true,
  })
  replaceTokensInDom(fragment, (key, doc) => {
    const lines = (variables[key]?.value ?? '').split('\n')
    return lines.flatMap((line, i) => (i ? [doc.createElement('br'), doc.createTextNode(line)] : [doc.createTextNode(line)]))
  })
  const container = document.createElement('div')
  container.append(fragment)
  return container.innerHTML
}

/** Editor output → stored HTML: variable chips become plain {{key}} tokens. */
export function stripVariableSpans(html) {
  return html.replace(/<span data-variable="[a-z][a-z0-9_]*">(\{\{[a-z][a-z0-9_]*\}\})<\/span>/g, '$1')
}

/**
 * Wraps plain {{key}} tokens in <span data-variable="key"> so the editor can show them as
 * variable chips.
 */
export function tokensToSpans(html) {
  const template = document.createElement('template')
  template.innerHTML = html
  replaceTokensInDom(template.content, (key, doc) => {
    const span = doc.createElement('span')
    span.setAttribute('data-variable', key)
    span.textContent = `{{${key}}}`
    return [span]
  })
  return template.innerHTML
}

/** Replaces {{key}} tokens in all text nodes under `root` with nodes from makeNodes(key, doc). */
function replaceTokensInDom(root, makeNodes) {
  const doc = root.ownerDocument || document
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const textNodes = []
  while (walker.nextNode()) {
    if (TOKEN.test(walker.currentNode.nodeValue)) textNodes.push(walker.currentNode)
    TOKEN.lastIndex = 0
  }
  for (const node of textNodes) {
    const text = node.nodeValue
    const parts = []
    let last = 0
    for (const match of text.matchAll(TOKEN)) {
      if (match.index > last) parts.push(doc.createTextNode(text.slice(last, match.index)))
      parts.push(...makeNodes(match[1], doc))
      last = match.index + match[0].length
    }
    if (last < text.length) parts.push(doc.createTextNode(text.slice(last)))
    node.replaceWith(...parts)
  }
}
