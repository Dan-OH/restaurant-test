/**
 * Where images are used, for the dashboard's file manager.
 *
 * Image placements are site_content keys named "<page>.<feature>.<name...>":
 *   home.hero.image        → page "Home", feature "Hero images"
 *   home.slideshow.main    → page "Home", feature "Slideshows"
 *
 * A placement's value is either one media id, or a JSON array of media ids for features
 * that hold several images (slideshows, galleries). Both are detected automatically.
 *
 * To add a page or feature, add it to PAGES / FEATURES below so it gets a proper name and
 * position in the file manager. Unknown ones still work, with names derived from the key.
 */

const PAGES = {
  home: { name: 'Home', path: '/', order: 1 },
  menu: { name: 'Menu', path: '/menu', order: 2 },
}
const SITEWIDE_PAGE = { name: 'All pages', path: '/', order: 50 }
// Key prefixes for parts of the layout that appear on every page.
const SITEWIDE = new Set(['site', 'header', 'footer'])

const FEATURES = {
  hero: { name: 'Hero images', item: 'Hero image', order: 1 },
  slideshow: { name: 'Slideshows', item: 'Slideshow', order: 2 },
  gallery: { name: 'Galleries', item: 'Gallery', order: 3 },
  logo: { name: 'Logos', item: 'Logo', order: 4 },
}

/** The media ids a placement value refers to: one id, or a JSON array of ids. */
export function placementIds(value) {
  if (!value) return []
  if (value.startsWith('[')) {
    try {
      const ids = JSON.parse(value)
      return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []
    } catch {
      return []
    }
  }
  return [value]
}

/** The placement value with `mediaId` removed (for deleting an image everywhere). */
export function removeFromPlacement(value, mediaId) {
  if (value?.startsWith('[')) return JSON.stringify(placementIds(value).filter((id) => id !== mediaId))
  return value === mediaId ? '' : value
}

export function describePlacement(key, index = 0, total = 1) {
  const [prefix, featureKey = 'image', ...rest] = key.split('.')
  const page = PAGES[prefix] ?? (SITEWIDE.has(prefix) ? SITEWIDE_PAGE : { name: capitalize(prefix), path: '/', order: 40 })
  const feature = FEATURES[featureKey] ?? {
    name: `${capitalize(featureKey)} images`,
    item: `${capitalize(featureKey)} image`,
    order: 40,
  }

  const name = rest.filter((p) => p !== 'image').join(' ')
  let label = name ? `${capitalize(name)} ${feature.item.toLowerCase()}` : feature.item
  if (total > 1) label += ` · image ${index + 1} of ${total}`

  return {
    key,
    page: page.name,
    pageOrder: page.order,
    path: page.path,
    feature: feature.name,
    featureOrder: feature.order,
    label,
  }
}

/** All placements that reference the given media id. */
export function findUsages(content, mediaId) {
  const usages = []
  for (const [key, value] of Object.entries(content)) {
    const ids = placementIds(value)
    const index = ids.indexOf(mediaId)
    if (index !== -1) usages.push(describePlacement(key, index, ids.length))
  }
  return usages
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
