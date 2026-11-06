import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useSite } from '../lib/site'
import { navLabel, navTree, pagePath } from '../lib/pages'

/**
 * Header navigation built from the Pages list. Pages with child pages get a dropdown: it opens
 * on hover and keyboard focus (CSS), and with the ▾ button on touch screens.
 */
export default function SiteNav() {
  const { pages } = useSite()
  const { pathname } = useLocation()
  const [openId, setOpenId] = useState(null)
  const navRef = useRef(null)

  // Close an open dropdown when clicking elsewhere or pressing Escape.
  useEffect(() => {
    if (!openId) return
    function onPointer(e) {
      if (!navRef.current?.contains(e.target)) setOpenId(null)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpenId(null)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [openId])

  const link = (page) => (
    <NavLink to={pagePath(page)} end={page.system_key === 'home'} onClick={() => setOpenId(null)}>
      {navLabel(page)}
    </NavLink>
  )

  return (
    <nav ref={navRef} aria-label="Main">
      <ul className="nav-list">
        {navTree(pages).map(({ page, children }) =>
          children.length ? (
            <li
              key={page.id}
              className={[
                'nav-item',
                'has-dropdown',
                openId === page.id && 'is-open',
                children.some((c) => pathname === pagePath(c)) && 'has-active-child',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {link(page)}
              <button
                type="button"
                className="nav-dropdown-toggle"
                aria-expanded={openId === page.id}
                aria-controls={`nav-dropdown-${page.id}`}
                aria-label={`${openId === page.id ? 'Hide' : 'Show'} pages under ${navLabel(page)}`}
                onClick={() => setOpenId((id) => (id === page.id ? null : page.id))}
              >
                <span aria-hidden>▾</span>
              </button>
              <ul className="nav-dropdown" id={`nav-dropdown-${page.id}`}>
                {children.map((child) => (
                  <li key={child.id}>{link(child)}</li>
                ))}
              </ul>
            </li>
          ) : (
            <li key={page.id} className="nav-item">
              {link(page)}
            </li>
          ),
        )}
      </ul>
    </nav>
  )
}
