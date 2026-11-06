/**
 * Where images are used, for the dashboard's file manager.
 *
 * Image placements are site_content keys named "<page>.<feature>.<name...>":
 *   home.hero.image        → page "Home", feature "Hero images"
 *   home.slideshow.main    → page "Home", feature "Slideshows"
 *   page-<id>.hero.image   → a page created in the dashboard (looked up in the pages table)
 *   section-<id>.image     → an image in a page section (page and layout looked up from the section)
 *
 * A placement's value is either one media id, or a JSON array of media ids for features
 * that hold several images (slideshows, galleries). Both are detected automatically.
 *
 * Page names come from the pages table, section layouts from src/sections/types.js (pass
 * `{ pages, sections }` to findUsages). To add a feature, add it to
 * FEATURES below so it gets a proper name and position. Unknown ones still work, with names
 * derived from the key.
 */

import { pagePath } from './pages'
import { SECTION_TYPES } from '../sections/types'

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

function pageForPrefix(prefix, pages) {
  if (SITEWIDE.has(prefix)) return SITEWIDE_PAGE
  const page = prefix.startsWith('page-')
    ? pages.find((p) => p.id === prefix.slice(5))
    : pages.find((p) => p.system_key === prefix)
  if (page) return { name: page.title, path: pagePath(page), order: page.nav_order }
  if (prefix.startsWith('page-')) return { name: 'Deleted page', path: '/', order: 45 }
  return { name: capitalize(prefix), path: '/', order: 40 }
}

function describeSectionPlacement(key, prefix, field, { pages, sections }) {
  const section = sections.find((s) => s.id === prefix.slice('section-'.length))
  const pageRow = section && pages.find((p) => p.id === section.page_id)
  const page = pageRow
    ? { name: pageRow.title, path: pagePath(pageRow), order: pageRow.nav_order }
    : { name: 'Deleted page', path: '/', order: 45 }
  const type = section && SECTION_TYPES[section.type]
  const typeLabel = type?.label ?? 'Unknown'
  const number = section
    ? sections.filter((s) => s.page_id === section.page_id && s.position < section.position).length + 1
    : null
  const fieldLabel = type?.images?.[field] ?? field
  return {
    key,
    page: page.name,
    pageOrder: page.order,
    path: page.path,
    feature: 'Page sections',
    featureOrder: 20,
    label: [number && `Section ${number}`, typeLabel, fieldLabel].filter(Boolean).join(' · '),
  }
}

export function describePlacement(key, index = 0, total = 1, { pages = [], sections = [] } = {}) {
  const [prefix, featureKey = 'image', ...rest] = key.split('.')
  if (prefix.startsWith('section-')) return describeSectionPlacement(key, prefix, featureKey, { pages, sections })
  const page = pageForPrefix(prefix, pages)
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

/** All placements that reference the given media id. `context` is { pages, sections }. */
export function findUsages(content, mediaId, context = {}) {
  const usages = []
  for (const [key, value] of Object.entries(content)) {
    const ids = placementIds(value)
    const index = ids.indexOf(mediaId)
    if (index !== -1) usages.push(describePlacement(key, index, ids.length, context))
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
