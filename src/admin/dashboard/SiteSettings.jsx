import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useSite } from '../../lib/site'
import FieldHint from '../FieldHint.jsx'
import { SEO_DEFAULTS, SEO_KEYS, SEO_LIMITS, usePageMeta, useSeoSettings } from '../../lib/seo'

export default function SiteSettings() {
  usePageMeta('Dashboard')
  const { saveText } = useSite()
  const saved = useSeoSettings()

  const [title, setTitle] = useState(saved.title)
  const [description, setDescription] = useState(saved.description)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const dirty = title.trim() !== saved.title || description.trim() !== saved.description
  const previewTitle = title.trim() || SEO_DEFAULTS.title

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const nextTitle = previewTitle
      const nextDescription = description.trim()
      if (nextTitle !== saved.title) await saveText(SEO_KEYS.title, nextTitle)
      if (nextDescription !== saved.description) await saveText(SEO_KEYS.description, nextDescription)
      setTitle(nextTitle)
      setDescription(nextDescription)
      setMessage({ severity: 'success', text: 'Settings saved.' })
    } catch (err) {
      setMessage({ severity: 'error', text: `Couldn't save: ${err.message}` })
    } finally {
      setBusy(false)
    }
  }

  function discard() {
    setTitle(saved.title)
    setDescription(saved.description)
    setMessage(null)
  }

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Site settings
      </Typography>
      <Typography sx={{ color: 'text.secondary' }}>
        How your site appears in browser tabs and search results.
      </Typography>

      <Card variant="outlined" sx={{ mt: 3 }}>
        <CardContent component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <Typography variant="h6" component="h2">
              Search &amp; SEO
            </Typography>

            <TextField
              label="Website title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={SEO_DEFAULTS.title}
              fullWidth
              helperText={
                <FieldHint value={title} limit={SEO_LIMITS.title}>
                  Shown in the browser tab and as the headline in search results. Other pages show as
                  "Menu · {previewTitle}".
                </FieldHint>
              }
              slotProps={{ htmlInput: { maxLength: 120 }, formHelperText: { component: 'div' } }}
            />

            <TextField
              label="Meta description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              minRows={3}
              fullWidth
              helperText={
                <FieldHint value={description} limit={SEO_LIMITS.description}>
                  A one- or two-sentence summary search engines may show under your title.
                </FieldHint>
              }
              slotProps={{ htmlInput: { maxLength: 320 }, formHelperText: { component: 'div' } }}
            />

            <SearchPreview title={previewTitle} description={description.trim()} />

            {message && <Alert severity={message.severity}>{message.text}</Alert>}

            <Stack direction="row" spacing={1}>
              <Button type="submit" variant="contained" loading={busy} disabled={!dirty}>
                Save settings
              </Button>
              {dirty && !busy && <Button onClick={discard}>Discard changes</Button>}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

// Mimics a search engine result so the title/description can be judged at a glance.
function SearchPreview({ title, description }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, fontFamily: 'Arial, sans-serif' }} aria-label="Search result preview">
      <Typography variant="overline" component="p" sx={{ color: 'text.secondary', lineHeight: 1.5, mb: 0.5 }}>
        Search preview
      </Typography>
      <Box sx={{ fontSize: 13, color: '#4d5156' }}>{window.location.host}</Box>
      <Box sx={{ fontSize: 20, lineHeight: 1.3, color: '#1a0dab' }}>{truncate(title, SEO_LIMITS.title)}</Box>
      <Box sx={{ fontSize: 14, color: '#4d5156' }}>
        {truncate(description, SEO_LIMITS.description) || (
          <Box component="span" sx={{ color: 'text.disabled' }}>
            No description yet.
          </Box>
        )}
      </Box>
    </Paper>
  )
}

function truncate(text, limit) {
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text
}
