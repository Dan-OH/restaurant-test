import { lazy, Suspense } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import { useSite } from '../lib/site'
import { navLabel, navPages, pagePath } from '../lib/pages'
import EditableText from './EditableText.jsx'

// Only logged-in users see the admin bar, so only they download it (and MUI).
const AdminBar = lazy(() => import('../admin/AdminBar.jsx'))

const YEAR = new Date().getFullYear()

export default function Layout() {
  const { session } = useAuth()
  const { editing, pages } = useSite()

  return (
    <>
      {session && (
        <Suspense fallback={null}>
          <AdminBar />
        </Suspense>
      )}
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand" onClick={(e) => editing && e.preventDefault()}>
            <EditableText id="site.name">{'{{restaurant_name}}'}</EditableText>
          </Link>
          <nav>
            {navPages(pages).map((page) => (
              <NavLink key={page.id} to={pagePath(page)} end={page.system_key === 'home'}>
                {navLabel(page)}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <span>
            © {YEAR}{' '}
            <EditableText id="footer.text">{'{{restaurant_name}} · {{phone}}'}</EditableText>
          </span>
          {!session && (
            <Link to="/login" className="staff-login">
              Staff login
            </Link>
          )}
        </div>
      </footer>
    </>
  )
}
