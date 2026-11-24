import { useParams } from 'react-router-dom'
import { useSite } from '../lib/site'
import ContentPage from './ContentPage.jsx'
import NotFound from './NotFound.jsx'

/** A page created in the dashboard, served at /<slug>. Drafts are only loaded for logged-in users. */
export default function DynamicPage() {
  const { slug } = useParams()
  const { pages } = useSite()
  const page = pages.find((p) => !p.system_key && p.slug === slug)

  if (!page) return <NotFound />
  return <ContentPage key={page.id} page={page} />
}
