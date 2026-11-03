import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../lib/useAuth'
import { useSignOut } from '../../lib/useSignOut'
import { useSeoSettings } from '../../lib/seo'

// Add future dashboard pages here and as routes in App.jsx.
const NAV = [{ to: '/admin', label: 'Site settings', end: true }]

export default function AdminLayout() {
  const { session } = useAuth()
  const signOut = useSignOut()
  const { title } = useSeoSettings()

  return (
    <div className="dashboard">
      <header className="dashboard-topbar">
        <div className="dashboard-topbar-inner">
          <div className="dashboard-topbar-left">
            <Link to="/" className="dashboard-back">
              ← View site
            </Link>
            <span className="dashboard-site-name">{title}</span>
          </div>
          <div className="dashboard-topbar-right">
            <span className="admin-bar-user">{session.user.email}</span>
            <button className="link-button" onClick={signOut}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        <aside className="dashboard-sidebar">
          <p className="dashboard-sidebar-heading">Dashboard</p>
          <nav aria-label="Dashboard">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
