import { useParams } from 'react-router-dom'
import EditableImage from '../components/EditableImage.jsx'
import EditableText from '../components/EditableText.jsx'
import PageSections from '../components/PageSections.jsx'
import { contentPrefix } from '../lib/pages'
import { usePageMeta } from '../lib/seo'
import { useSite } from '../lib/site'
import NotFound from './NotFound.jsx'

/** A page created in the dashboard, served at /<slug>. Drafts are only loaded for logged-in users. */
export default function DynamicPage() {
  const { slug } = useParams()
  const { pages } = useSite()
  const page = pages.find((p) => !p.system_key && p.slug === slug)

  if (!page) return <NotFound />
  return <PageTemplate key={page.id} page={page} />
}

function PageTemplate({ page }) {
  usePageMeta(page.title, page)
  switch (page.template) {
    case 'basic':
    default:
      return <BasicTemplate page={page} />
  }
}

/** Optional hero image, heading and intro, then the page's sections. All editable in place. */
function BasicTemplate({ page }) {
  const prefix = contentPrefix(page)

  return (
    <>
      <section className="hero hero--compact">
        <EditableImage id={`${prefix}.hero.image`} folder="pages" className="hero-image" label="header image" />
        <div className="container hero-content">
          <EditableText id={`${prefix}.heading`} as="h1">
            {page.title}
          </EditableText>
          <EditableText id={`${prefix}.intro`} as="p" />
        </div>
      </section>

      <PageSections page={page} />
    </>
  )
}
