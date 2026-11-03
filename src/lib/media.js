/**
 * Where images are used. Placement keys follow "<page>.<slot>", e.g. "home.hero.image",
 * so the page is derived from the first segment. Add new pages here as the site grows.
 */
const PAGES = {
  home: { name: 'Home', path: '/' },
  menu: { name: 'Menu', path: '/menu' },
}

// Key prefixes for parts of the layout that appear on every page.
const SITEWIDE = new Set(['site', 'header', 'footer'])

export function describePlacement(key) {
  const [prefix, ...rest] = key.split('.')
  const page = PAGES[prefix] ?? (SITEWIDE.has(prefix) ? { name: 'All pages', path: '/' } : { name: prefix, path: '/' })
  const slot = rest.filter((part) => part !== 'image').join(' ') || 'image'
  return { key, page: page.name, path: page.path, label: `${capitalize(slot)} image` }
}

/** All placements (site_content keys) that reference the given media id. */
export function findUsages(content, mediaId) {
  return Object.entries(content)
    .filter(([, value]) => value === mediaId)
    .map(([key]) => describePlacement(key))
}

export function formatBytes(bytes) {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatType(mime) {
  if (!mime) return '—'
  return mime.replace('image/', '').replace('jpeg', 'jpg').toUpperCase()
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
