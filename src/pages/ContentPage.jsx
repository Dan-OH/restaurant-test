import PageSections from '../components/PageSections.jsx'
import { usePageMeta } from '../lib/seo'

/**
 * A page built from sections: Home and every page created in the dashboard.
 * Starts blank; in edit mode sections are added, moved and removed in place.
 */
export default function ContentPage({ page }) {
  // Home uses the site title on its own; other pages show "<page> | <site>".
  usePageMeta(page.system_key === 'home' ? undefined : page.title, page)
  return <PageSections page={page} />
}
