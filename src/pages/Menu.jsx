import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { fetchMenu, formatPrice } from '../lib/api'
import { useSite } from '../lib/site'
import { usePageMeta } from '../lib/seo'
import { systemPage } from '../lib/pages'
import EditableText from '../components/EditableText.jsx'
import PageSections from '../components/PageSections.jsx'

// Admin-only (MUI); loaded the first time edit mode is turned on.
const MenuEditor = lazy(() => import('../admin/menu/MenuEditor.jsx'))

export default function Menu() {
  const { editing, getText, pages } = useSite()
  const page = systemPage(pages, 'menu')
  usePageMeta(getText('menu.title', 'Menu'), page)
  const [sections, setSections] = useState(null)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    try {
      setSections(await fetchMenu())
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    fetchMenu()
      .then(setSections)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <>
      <div className="container page menu">
        <EditableText id="menu.title" as="h1">
          Menu
        </EditableText>
        {error && <p className="error">Couldn't load the menu: {error}</p>}
        {!sections && !error && <p>Loading…</p>}

        {sections && editing && (
          <Suspense fallback={null}>
            <MenuEditor sections={sections} setSections={setSections} reload={reload} />
          </Suspense>
        )}

        {sections?.length === 0 && (
          <EditableText id="menu.empty" as="p" className="muted">
            The menu is coming soon.
          </EditableText>
        )}

        {sections &&
          !editing &&
          sections.map((section) => (
            <section key={section.id} className="menu-section">
              <h2>{section.name}</h2>
              {section.description && <p className="muted">{section.description}</p>}
              <ul className="menu-items">
                {section.items.map((item) => (
                  <li key={item.id} className="menu-item">
                    <div className="menu-item-head">
                      <span className="menu-item-name">{item.name}</span>
                      <span className="dots" />
                      <span className="menu-item-price">{formatPrice(item.price)}</span>
                    </div>
                    {item.description && <p className="muted">{item.description}</p>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>

      <PageSections page={page} />
    </>
  )
}
