import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import Home from './pages/Home.jsx'
import Menu from './pages/Menu.jsx'
import Login from './pages/Login.jsx'
import AdminMenu from './pages/AdminMenu.jsx'
import { isConfigured } from './lib/supabase'

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
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="menu" element={<Menu />} />
        <Route path="login" element={<Login />} />
        <Route
          path="admin"
          element={
            <RequireAuth>
              <AdminMenu />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
