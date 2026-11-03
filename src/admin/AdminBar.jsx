import { Link as RouterLink } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import CheckIcon from '@mui/icons-material/Check'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import EditIcon from '@mui/icons-material/Edit'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAuth } from '../lib/useAuth'
import { useSite } from '../lib/site'
import { useSignOut } from '../lib/useSignOut'
import AdminTheme from './AdminTheme.jsx'
import { BAR_COLOR, BAR_EDITING_COLOR } from './theme'

/** Sticky bar above the site for logged-in users: edit-mode toggle, dashboard link, save status. */
export default function AdminBar() {
  const { session } = useAuth()
  const { editing, setEditing } = useSite()
  const signOut = useSignOut()

  if (!session) return null

  return (
    <AdminTheme>
      <AppBar
        position="sticky"
        component="div"
        role="region"
        aria-label="Site editing"
        elevation={0}
        sx={{ top: 0, bgcolor: editing ? BAR_EDITING_COLOR : BAR_COLOR, transition: 'background-color 0.2s' }}
      >
        <Toolbar variant="dense" sx={{ gap: 1.5, flexWrap: 'wrap', py: 0.5 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={editing ? <CheckIcon /> : <EditIcon />}
            onClick={() => setEditing(!editing)}
            aria-pressed={editing}
            sx={editing ? { bgcolor: '#fff', color: BAR_EDITING_COLOR, '&:hover': { bgcolor: '#eef3f1' } } : undefined}
          >
            {editing ? 'Done editing' : 'Edit page'}
          </Button>
          <Button
            component={RouterLink}
            to="/admin"
            color="inherit"
            size="small"
            startIcon={<DashboardOutlinedIcon />}
          >
            Dashboard
          </Button>
          {editing && (
            <Typography variant="body2" sx={{ opacity: 0.8, display: { xs: 'none', md: 'block' } }}>
              Click any outlined text to change it.
            </Typography>
          )}

          <Box sx={{ flexGrow: 1 }} />

          <SaveStatus />
          <Typography variant="body2" sx={{ opacity: 0.7, display: { xs: 'none', sm: 'block' } }}>
            {session.user.email}
          </Typography>
          <Button color="inherit" size="small" startIcon={<LogoutIcon />} onClick={signOut}>
            Log out
          </Button>
        </Toolbar>
      </AppBar>
    </AdminTheme>
  )
}

function SaveStatus() {
  const { status, statusError } = useSite()
  if (status === 'idle') return null

  const content = {
    saving: [<CircularProgress key="i" size={14} color="inherit" />, 'Saving…'],
    saved: [<CheckCircleOutlinedIcon key="i" fontSize="small" />, 'All changes saved'],
    error: [<ErrorOutlinedIcon key="i" fontSize="small" sx={{ color: '#ffb4a8' }} />, 'Save failed'],
  }[status]

  const label = (
    <Stack direction="row" spacing={0.75} role="status" sx={{ alignItems: 'center', opacity: 0.9 }}>
      {content[0]}
      <Typography variant="body2" sx={{ color: status === 'error' ? '#ffb4a8' : 'inherit' }}>
        {content[1]}
      </Typography>
    </Stack>
  )

  return status === 'error' ? <Tooltip title={statusError}>{label}</Tooltip> : label
}
