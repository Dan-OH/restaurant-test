/**
 * Site variables: reusable text (address, phone…) referenced in page text as {{key}}.
 * Values are managed in Dashboard → Variables and substituted wherever the text is shown.
 */

// {{key}}, allowing spaces inside the braces: {{ address }}
const TOKEN = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g

// Used if the variables table can't be loaded (e.g. before the database script has been run).
export const FALLBACK_VARIABLES = [
  { id: 'fallback-restaurant_name', key: 'restaurant_name', label: 'Restaurant name', value: 'The Restaurant' },
  { id: 'fallback-address', key: 'address', label: 'Address', value: '123 Main Street\nYour City' },
  { id: 'fallback-phone', key: 'phone', label: 'Phone number', value: '(555) 123-4567' },
]

export function tokenFor(key) {
  return `{{${key}}}`
}

/** Splits text into [{ text } | { variable: key }] parts. */
export function splitTokens(text) {
  const parts = []
  let last = 0
  for (const match of text.matchAll(TOKEN)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) })
    parts.push({ variable: match[1] })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}

/** Replaces every {{key}} with its value (unknown variables become empty). */
export function resolveVariables(text, variables) {
  if (!text) return text
  return text.replace(TOKEN, (_, key) => variables[key]?.value ?? '')
}

export function hasToken(text, key) {
  return Boolean(text) && tokenPattern(key).test(text)
}

/** Rewrites {{oldKey}} to `replacement` in a piece of text. */
export function replaceToken(text, key, replacement) {
  return text.replace(tokenPattern(key), () => replacement)
}

function tokenPattern(key) {
  return new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
}

/** site_content keys whose text uses the variable. */
export function variableUsageKeys(content, key) {
  return Object.entries(content)
    .filter(([, value]) => hasToken(value, key))
    .map(([contentKey]) => contentKey)
}

export function keyFromLabel(label) {
  return label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^[^a-z]+|_+$/g, '')
    .slice(0, 40)
}

/** Returns an error message, or null if the key is valid and free. */
export function validateVariableKey(key, variables, currentId) {
  if (!key) return 'Enter a key.'
  if (!/^[a-z][a-z0-9_]*$/.test(key)) return 'Start with a letter; use lowercase letters, numbers and underscores.'
  if (variables.some((v) => v.key === key && v.id !== currentId)) return `Another variable already uses "${key}".`
  return null
}
