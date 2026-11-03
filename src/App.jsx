import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Menu from './pages/Menu.jsx'
import { isConfigured } from './lib/supabase'
import { SiteProvider } from './lib/SiteProvider.jsx'

// Admin UI (MUI) lives in src/admin and is loaded only when needed,
// so visitors to the public site never download it.
const Login = lazy(() => import('./admin/Login.jsx'))
const AdminDashboard = lazy(() => import('./admin/dashboard/AdminDashboard.jsx'))

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
      <Suspense fallback={null}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="menu" element={<Menu />} />
            <Route path="login" element={<Login />} />
          </Route>

          <Route path="admin/*" element={<AdminDashboard />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </SiteProvider>
  )
}
