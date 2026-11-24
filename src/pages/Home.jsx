import ContentPage from './ContentPage.jsx'
import { useSite } from '../lib/site'
import { systemPage } from '../lib/pages'

/** The home page: a normal section-built page that comes with the site and can't be deleted. */
export default function Home() {
  const { pages } = useSite()
  const page = systemPage(pages, 'home')
  return <ContentPage key={page.id} page={page} />
}
