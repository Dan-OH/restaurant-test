import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'

export default function RequireAuth({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="container page">Loading…</div>
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}
