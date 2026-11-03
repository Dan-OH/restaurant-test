import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { usePageMeta } from '../lib/seo'
import AdminTheme from './AdminTheme.jsx'

export default function Login() {
  return (
    <AdminTheme>
      <LoginForm />
    </AdminTheme>
  )
}

function LoginForm() {
  usePageMeta('Log in')
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const redirectTo = location.state?.from || '/'

  if (session) return <Navigate to={redirectTo} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(error.message)
    else navigate(redirectTo, { replace: true })
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', px: 2, py: { xs: 4, sm: 8 } }}>
      <Card variant="outlined" sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <div>
              <Typography variant="h5" component="h1">
                Staff login
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Log in to edit the site.
              </Typography>
            </div>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              fullWidth
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" size="large" loading={busy} fullWidth>
              Log in
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
