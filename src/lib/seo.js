import { useEffect } from 'react'
import { useSite } from './site'

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
 */
export function usePageMeta(pageTitle) {
  const { title, description } = useSeoSettings()

  useEffect(() => {
    document.title = formatPageTitle(pageTitle, title)
  }, [pageTitle, title])

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
