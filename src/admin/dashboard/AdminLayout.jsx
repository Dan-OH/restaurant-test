import { Link as RouterLink, NavLink, Outlet } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import LogoutIcon from '@mui/icons-material/Logout'
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import { useAuth } from '../../lib/useAuth'
import { useSignOut } from '../../lib/useSignOut'
import { useSeoSettings } from '../../lib/seo'
import { BAR_COLOR } from '../theme'

// Add future dashboard pages here and as routes in AdminDashboard.jsx.
const NAV = [
  { to: '/admin', label: 'Site settings', icon: <TuneOutlinedIcon />, end: true },
  { to: '/admin/files', label: 'Files', icon: <PhotoLibraryOutlinedIcon /> },
]

const SIDEBAR_WIDTH = 240

export default function AdminLayout() {
  const { session } = useAuth()
  const signOut = useSignOut()
  const { title } = useSeoSettings()

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        color: 'text.primary',
        fontFamily: (t) => t.typography.fontFamily,
      }}
    >
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: BAR_COLOR }}>
        <Toolbar variant="dense" sx={{ gap: 2 }}>
          <Button component={RouterLink} to="/" color="inherit" size="small" startIcon={<ArrowBackIcon />}>
            View site
          </Button>
          <Typography variant="body2" sx={{ opacity: 0.7, display: { xs: 'none', sm: 'block' } }}>
            {title}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" sx={{ opacity: 0.7, display: { xs: 'none', sm: 'block' } }}>
            {session.user.email}
          </Typography>
          <Button color="inherit" size="small" startIcon={<LogoutIcon />} onClick={signOut}>
            Log out
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
        <Box
          component="aside"
          sx={{
            width: { md: SIDEBAR_WIDTH },
            flexShrink: 0,
            bgcolor: 'background.paper',
            borderRight: { md: 1 },
            borderBottom: { xs: 1, md: 0 },
            borderColor: 'divider',
            p: { xs: 1, md: 1.5 },
          }}
        >
          <Typography
            variant="overline"
            component="p"
            sx={{ px: 1.5, color: 'text.secondary', display: { xs: 'none', md: 'block' } }}
          >
            Dashboard
          </Typography>
          <List component="nav" aria-label="Dashboard" disablePadding sx={{ display: { xs: 'flex', md: 'block' }, gap: 0.5 }}>
            {NAV.map((item) => (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                end={item.end}
                sx={{
                  borderRadius: 1,
                  flexGrow: 0,
                  '&.active': { bgcolor: 'action.selected', fontWeight: 600 },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontWeight: 'inherit' } } }} />
              </ListItemButton>
            ))}
          </List>
        </Box>

        <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, sm: 3, md: 4 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
