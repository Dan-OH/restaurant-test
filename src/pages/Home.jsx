import { Link } from 'react-router-dom'
import EditableText from '../components/EditableText.jsx'
import EditableImage from '../components/EditableImage.jsx'
import PageSections from '../components/PageSections.jsx'
import { useSite } from '../lib/site'
import { usePageMeta } from '../lib/seo'
import { systemPage } from '../lib/pages'

export default function Home() {
  const { editing, pages } = useSite()
  const page = systemPage(pages, 'home')
  usePageMeta(undefined, page)

  return (
    <>
      <section className="hero">
        <EditableImage id="home.hero.image" folder="hero" className="hero-image" label="hero image" />
        <div className="container hero-content">
          <EditableText id="home.hero.title" as="h1">
            Seasonal food, made with care
          </EditableText>
          <EditableText id="home.hero.subtitle" as="p">
            A neighbourhood restaurant serving honest, local ingredients every day.
          </EditableText>
          <Link to="/menu" className="button" onClick={(e) => editing && e.preventDefault()}>
            <EditableText id="home.hero.button">View the menu</EditableText>
          </Link>
        </div>
      </section>

      <section className="container page info-grid">
        <div>
          <EditableText id="home.hours.title" as="h2">
            Hours
          </EditableText>
          <EditableText id="home.hours.body" as="p" multiline>
            {'Tue – Thu: 5pm – 10pm\nFri – Sat: 5pm – 11pm\nSun: 10am – 3pm (brunch)'}
          </EditableText>
        </div>
        <div>
          <EditableText id="home.location.title" as="h2">
            Location
          </EditableText>
          <EditableText id="home.location.body" as="p" multiline>
            {'123 Main Street\nYour City'}
          </EditableText>
        </div>
        <div>
          <EditableText id="home.reservations.title" as="h2">
            Reservations
          </EditableText>
          <EditableText id="home.reservations.body" as="p" multiline>
            {'Call us at (555) 123-4567\nWalk-ins always welcome'}
          </EditableText>
        </div>
      </section>

      <PageSections page={page} />
    </>
  )
}
