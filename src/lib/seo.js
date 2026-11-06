import { useEffect } from 'react'
import { useSite } from './site'
import { resolveVariables } from './variables'

// site_content keys for site-wide settings, and their defaults.
export const SEO_KEYS = {
  title: 'settings.siteTitle',
  description: 'settings.metaDescription',
}

export const SEO_DEFAULTS = {
  title: 'The Restaurant',
  description: 'A neighbourhood restaurant serving honest, local ingredients every day.',
}

// Recommended maximum lengths before search engines start truncating.
export const SEO_LIMITS = { title: 60, description: 160 }

export function useSeoSettings() {
  const { getText } = useSite()
  return {
    title: getText(SEO_KEYS.title, SEO_DEFAULTS.title),
    description: getText(SEO_KEYS.description, SEO_DEFAULTS.description),
  }
}

export function formatPageTitle(pageTitle, siteTitle) {
  return pageTitle ? `${pageTitle} · ${siteTitle}` : siteTitle
}

/**
 * Sets the browser tab title and meta description for the current page.
 * Pass a page name (e.g. "Menu") to get "Menu · Site Title"; omit it for the homepage.
 * Pass a `page` row to apply its SEO overrides (seo_title replaces the whole title,
 * seo_description replaces the site-wide description).
 */
export function usePageMeta(pageTitle, page) {
  const site = useSeoSettings()
  const { variables } = useSite()
  // Titles and descriptions can use site variables, e.g. "Dinner in {{address}}".
  const fullTitle = resolveVariables(
    page?.seo_title?.trim() || formatPageTitle(pageTitle, site.title),
    variables,
  ).replace(/\s*\n\s*/g, ' ')
  const description = resolveVariables(page?.seo_description?.trim() || site.description, variables).replace(
    /\s*\n\s*/g,
    ' ',
  )

  useEffect(() => {
    document.title = fullTitle
  }, [fullTitle])

  useEffect(() => {
    let tag = document.querySelector('meta[name="description"]')
    if (!tag) {
      tag = document.createElement('meta')
      tag.name = 'description'
      document.head.appendChild(tag)
    }
    tag.content = description
  }, [description])
}
