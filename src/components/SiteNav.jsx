import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useSite } from '../lib/site'
import { navLabel, pagePath } from '../lib/pages'
import { publicNav } from '../lib/nav'

/**
 * Header navigation built from Pages: pages are links, navigation groups are dropdowns (groups
 * inside groups open as side menus). A dropdown opens when its group name is clicked (or
 * activated with Enter/Space), and closes on a second click, a click elsewhere, Escape,
 * choosing a page, or tabbing out of the navigation.
 */
export default function SiteNav() {
  const { pages, navGroups } = useSite()
  const { pathname } = useLocation()
  const [openPath, setOpenPath] = useState([]) // ids of the open group and its open sub-groups
  const navRef = useRef(null)

  // Close open dropdowns when clicking elsewhere, pressing Escape, or moving focus out of the nav.
  useEffect(() => {
    if (!openPath.length) return
    function onPointer(e) {
      if (!navRef.current?.contains(e.target)) setOpenPath([])
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpenPath([])
    }
    function onFocus(e) {
      if (!navRef.current?.contains(e.target)) setOpenPath([])
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    document.addEventListener('focusin', onFocus)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('focusin', onFocus)
    }
  }, [openPath])

  function toggle(groupId, depth) {
    setOpenPath((path) => (path[depth] === groupId ? path.slice(0, depth) : [...path.slice(0, depth), groupId]))
  }

  const renderNode = (node, depth) => {
    if (node.type === 'page') {
      const page = node.item
      return (
        <li key={node.key} className="nav-item">
          <NavLink to={pagePath(page)} end={page.system_key === 'home'} onClick={() => setOpenPath([])}>
            {navLabel(page)}
          </NavLink>
        </li>
      )
    }
    const group = node.item
    const open = openPath[depth] === group.id
    const menuId = `nav-group-${group.id}`
    return (
      <li
        key={node.key}
        className={[
          'nav-item',
          'has-dropdown',
          depth > 0 && 'is-submenu',
          open && 'is-open',
          containsPath(node, pathname) && 'has-active-child',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <button
          type="button"
          className="nav-group-toggle"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => toggle(group.id, depth)}
        >
          {group.title}
          <span className="nav-caret" aria-hidden>
            {depth > 0 ? '▸' : '▾'}
          </span>
        </button>
        <ul className="nav-dropdown" id={menuId}>
          {node.children.map((child) => renderNode(child, depth + 1))}
        </ul>
      </li>
    )
  }

  return (
    <nav ref={navRef} aria-label="Main">
      <ul className="nav-list">{publicNav(pages, navGroups).map((node) => renderNode(node, 0))}</ul>
    </nav>
  )
}

function containsPath(node, pathname) {
  return node.children.some((c) => (c.type === 'page' ? pagePath(c.item) === pathname : containsPath(c, pathname)))
}
