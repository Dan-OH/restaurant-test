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

/** Published pages shown in the header navigation, in order. */
export function navPages(pages) {
  return pages.filter((p) => p.show_in_nav && p.published).sort((a, b) => a.nav_order - b.nav_order)
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
