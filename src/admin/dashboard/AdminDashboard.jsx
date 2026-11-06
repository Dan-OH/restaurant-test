import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useAuth } from '../../lib/useAuth'
import AdminTheme from '../AdminTheme.jsx'
import AdminLayout from './AdminLayout.jsx'
import SiteSettings from './SiteSettings.jsx'
import AssetsManager from './AssetsManager.jsx'
import PagesManager from './PagesManager.jsx'
import VariablesManager from '../variables/VariablesManager.jsx'

/**
 * Everything under /admin. Lazy-loaded from App.jsx.
 * To add a dashboard page: add a <Route> here and an entry to NAV in AdminLayout.jsx.
 */
export default function AdminDashboard() {
  return (
    <AdminTheme>
      <RequireAuth>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route index element={<SiteSettings />} />
            <Route path="pages" element={<PagesManager />} />
            <Route path="assets" element={<AssetsManager />} />
            {/* Old address for Assets, kept so existing links still work. */}
            <Route path="files" element={<RedirectTo path="/admin/assets" />} />
            <Route path="variables" element={<VariablesManager />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Routes>
      </RequireAuth>
    </AdminTheme>
  )
}

// Redirects while keeping the query string (e.g. ?image=…).
function RedirectTo({ path }) {
  const { search } = useLocation()
  return <Navigate to={`${path}${search}`} replace />
}

function RequireAuth({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    )
  }
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}
