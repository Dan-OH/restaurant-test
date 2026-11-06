/**
 * Helpers for the `pages` table. Home and Menu are system pages (system_key 'home' / 'menu');
 * other pages are created in the dashboard and use a template (currently only 'basic').
 */

export const TEMPLATES = {
  basic: { label: 'Basic page', description: 'Optional hero image, heading, intro and body text.' },
}

// Used if the pages table can't be loaded (e.g. before the database script has been run).
export const FALLBACK_PAGES = [
  { id: 'system-home', system_key: 'home', slug: '', title: 'Home', show_in_nav: true, nav_order: 0, published: true, template: 'system' },
  { id: 'system-menu', system_key: 'menu', slug: 'menu', title: 'Menu', show_in_nav: true, nav_order: 1, published: true, template: 'system' },
]

export function systemPage(pages, key) {
  return pages.find((p) => p.system_key === key) ?? FALLBACK_PAGES.find((p) => p.system_key === key)
}

// Addresses that can't be used as page slugs because the app already uses them.
const RESERVED_SLUGS = new Set(['admin', 'login', 'menu', 'assets', 'api', 'index', 'favicon'])

export function pagePath(page) {
  return page.system_key === 'home' ? '/' : `/${page.slug}`
}

/** Prefix for this page's site_content keys: "home", "menu", or "page-<id>". */
export function contentPrefix(page) {
  return page.system_key ?? `page-${page.id}`
}

export function navLabel(page) {
  return page.nav_label?.trim() || page.title
}

const byOrder = (a, b) => a.nav_order - b.nav_order

/**
 * All pages as a tree for the dashboard: [{ page, children: [page…] }], in order.
 * Pages whose parent is missing are shown at the top level.
 */
export function pageTree(pages) {
  const ids = new Set(pages.map((p) => p.id))
  const isTop = (p) => !p.parent_id || !ids.has(p.parent_id)
  return pages
    .filter(isTop)
    .sort(byOrder)
    .map((page) => ({ page, children: pages.filter((c) => c.parent_id === page.id).sort(byOrder) }))
}

/**
 * The header navigation: published pages with "show in navigation", as
 * [{ page, children: [page…] }]. Children of a page that isn't in the nav take its place.
 */
export function navTree(pages) {
  const visible = (p) => p.show_in_nav && p.published
  return pageTree(pages).flatMap(({ page, children }) => {
    const shown = children.filter(visible)
    // A hidden parent's visible children take its place in the menu.
    if (!visible(page)) return shown.map((child) => ({ page: child, children: [] }))
    return [{ page, children: shown }]
  })
}

/** Whether `page` may be nested under `parent` (one level deep; Home is never nested). */
export function canNest(page, parent, pages) {
  if (!parent || page.id === parent.id) return false
  if (page.system_key === 'home') return false
  if (parent.parent_id) return false // parents must be top-level
  if (pages.some((p) => p.parent_id === page.id)) return false // has its own children
  return true
}

/**
 * New arrangement after moving `pageId` to be a child of `parentId` (null = top level) at
 * `index` among its new siblings (counted without the moved page). Returns every page as
 * { id, parent_id, position } for arrangePages.
 */
export function arrangeAfterMove(pages, pageId, parentId, index) {
  const moved = pages.find((p) => p.id === pageId)
  const siblingsOf = (pid) =>
    pages.filter((p) => p.id !== pageId && (p.parent_id ?? null) === pid).sort(byOrder)

  const lists = new Map()
  for (const p of pages) {
    const pid = p.parent_id ?? null
    if (!lists.has(pid)) lists.set(pid, siblingsOf(pid))
  }
  const target = lists.get(parentId) ?? siblingsOf(parentId)
  target.splice(Math.max(0, Math.min(index, target.length)), 0, moved)
  lists.set(parentId, target)

  const items = []
  for (const [pid, list] of lists) {
    list.forEach((p, position) => items.push({ id: p.id, parent_id: pid, position }))
  }
  return items
}

export function findPageByPath(pages, pathname) {
  const slug = pathname.replace(/^\/+|\/+$/g, '')
  return pages.find((p) => (p.system_key === 'home' ? slug === '' : p.slug === slug)) ?? null
}

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents: "Café" → "cafe"
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** Returns an error message, or null if the slug is valid and free. */
export function validateSlug(slug, pages, currentId) {
  if (!slug) return 'Enter a URL for the page.'
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return 'Use lowercase letters, numbers and single dashes only.'
  if (RESERVED_SLUGS.has(slug)) return `"/${slug}" is reserved by the site. Choose another.`
  if (pages.some((p) => p.slug === slug && p.id !== currentId)) return `Another page already uses "/${slug}".`
  return null
}
