import { lazy, Suspense } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import { useSite } from '../lib/site'
import EditableText from './EditableText.jsx'

// Only logged-in users see the admin bar, so only they download it (and MUI).
const AdminBar = lazy(() => import('../admin/AdminBar.jsx'))

const YEAR = new Date().getFullYear()

export default function Layout() {
  const { session } = useAuth()
  const { editing } = useSite()

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
            <EditableText id="site.name">The Restaurant</EditableText>
          </Link>
          <nav>
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/menu">Menu</NavLink>
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
            <EditableText id="footer.text">The Restaurant · 123 Main Street · (555) 123-4567</EditableText>
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
