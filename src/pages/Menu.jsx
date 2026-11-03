import { useEffect, useState } from 'react'
import { fetchMenu, formatPrice } from '../lib/menuApi'

export default function Menu() {
  const [sections, setSections] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchMenu()
      .then(setSections)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div className="container page menu">
      <h1>Menu</h1>
      {error && <p className="error">Couldn't load the menu: {error}</p>}
      {!sections && !error && <p>Loading…</p>}
      {sections?.length === 0 && <p>The menu is coming soon.</p>}

      {sections?.map((section) => (
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
  )
}
