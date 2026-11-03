import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import Home from './pages/Home.jsx'
import Menu from './pages/Menu.jsx'
import Login from './pages/Login.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import SiteSettings from './pages/admin/SiteSettings.jsx'
import { isConfigured } from './lib/supabase'
import { SiteProvider } from './lib/SiteProvider.jsx'

export default function App() {
  if (!isConfigured) {
    return (
      <div className="container notice">
        <h1>Supabase isn't configured</h1>
        <p>
          Copy <code>.env.example</code> to <code>.env.local</code>, fill in your project URL and
          publishable key, then restart <code>npm run dev</code>.
        </p>
      </div>
    )
  }

  return (
    <SiteProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="menu" element={<Menu />} />
          <Route path="login" element={<Login />} />
        </Route>

        <Route
          path="admin"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<SiteSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SiteProvider>
  )
}
