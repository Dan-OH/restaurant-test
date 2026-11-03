import { Link } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import { useSite } from '../lib/site'
import { useSignOut } from '../lib/useSignOut'

const STATUS_TEXT = {
  idle: '',
  saving: 'Saving…',
  saved: 'All changes saved',
}

export default function AdminBar() {
  const { session } = useAuth()
  const { editing, setEditing, status, statusError } = useSite()
  const signOut = useSignOut()

  if (!session) return null

  return (
    <div className={`admin-bar${editing ? ' is-editing' : ''}`} role="region" aria-label="Site editing">
      <div className="container admin-bar-inner">
        <div className="admin-bar-left">
          <button
            className={`button small ${editing ? '' : 'secondary on-dark'}`}
            onClick={() => setEditing(!editing)}
            aria-pressed={editing}
          >
            {editing ? 'Done editing' : 'Edit page'}
          </button>
          <Link to="/admin" className="admin-bar-link">
            Dashboard
          </Link>
          {editing && <span className="admin-bar-hint">Click any outlined text to change it.</span>}
        </div>
        <div className="admin-bar-right">
          <span className={`admin-bar-status ${status}`} role="status">
            {status === 'error' ? `Save failed: ${statusError}` : STATUS_TEXT[status]}
          </span>
          <span className="admin-bar-user">{session.user.email}</span>
          <button className="link-button" onClick={signOut}>
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}
