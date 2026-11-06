import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { TEMPLATES, slugify, validateSlug } from '../../lib/pages'
import { SEO_LIMITS, formatPageTitle, useSeoSettings } from '../../lib/seo'
import { useSite } from '../../lib/site'
import FieldHint from '../FieldHint.jsx'

/**
 * Create a page (`page` omitted) or edit a page's settings.
 * onSaved(page, { editContent }) is called after a successful save.
 */
export default function PageSettingsDialog({ page, onClose, onSaved }) {
  const site = useSite()
  const seo = useSeoSettings()
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const isNew = !page
  const isSystem = Boolean(page?.system_key)

  const [title, setTitle] = useState(page?.title ?? '')
  const [slug, setSlug] = useState(page?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [template, setTemplate] = useState(page?.template ?? 'basic')
  const [navLabel, setNavLabel] = useState(page?.nav_label ?? '')
  const [showInNav, setShowInNav] = useState(page?.show_in_nav ?? true)
  const [published, setPublished] = useState(page?.published ?? false)
  const [seoTitle, setSeoTitle] = useState(page?.seo_title ?? '')
  const [seoDescription, setSeoDescription] = useState(page?.seo_description ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const slugError = isSystem ? null : validateSlug(slug, site.pages, page?.id)
  const titleError = title.trim() ? null : 'Enter a title.'

  function handleTitle(value) {
    setTitle(value)
    // Keep the URL in sync with the title until the user edits the URL themselves.
    if (!slugTouched) setSlug(slugify(value))
  }

  async function save({ editContent = false } = {}) {
    setSubmitted(true)
    if (titleError || slugError) return
    setBusy(true)
    setError(null)
    const fields = {
      title: title.trim(),
      nav_label: navLabel.trim() || null,
      show_in_nav: showInNav,
      seo_title: seoTitle.trim() || null,
      seo_description: seoDescription.trim() || null,
    }
    try {
      let saved
      if (isNew) {
        const nextOrder = Math.max(-1, ...site.pages.map((p) => p.nav_order)) + 1
        saved = await site.addPage({ ...fields, slug, template, published, nav_order: nextOrder })
      } else {
        saved = await site.updatePage(page.id, isSystem ? fields : { ...fields, slug, published })
      }
      onSaved?.(saved, { editContent })
    } catch (e) {
      setError(e.code === '23505' ? `Another page already uses "/${slug}".` : e.message)
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onClose={() => !busy && onClose()}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
      aria-labelledby="page-settings-title"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <DialogTitle id="page-settings-title">{isNew ? 'New page' : `Page settings: ${page.title}`}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => handleTitle(e.target.value)}
              required
              autoFocus={isNew}
              fullWidth
              error={submitted && Boolean(titleError)}
              helperText={(submitted && titleError) || 'Shown as the page heading and in the browser tab.'}
            />

            <TextField
              label="URL"
              value={isSystem && page.system_key === 'home' ? '' : slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))
              }}
              onBlur={() => setSlug((s) => slugify(s))}
              disabled={isSystem}
              fullWidth
              error={(submitted || slugTouched) && Boolean(slugError)}
              helperText={
                isSystem
                  ? "Built-in pages keep their address."
                  : ((submitted || slugTouched) && slugError) || 'The address of the page on your site.'
              }
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start" sx={{ mr: 0 }}>
                      {window.location.host}/
                    </InputAdornment>
                  ),
                },
                htmlInput: { spellCheck: false },
              }}
            />

            {isNew && (
              <TextField
                select
                label="Template"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                fullWidth
                helperText={TEMPLATES[template]?.description}
              >
                {Object.entries(TEMPLATES).map(([key, t]) => (
                  <MenuItem key={key} value={key}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <Divider />
            <Typography variant="subtitle2">Navigation &amp; visibility</Typography>

            <FormControlLabel
              control={<Switch checked={showInNav} onChange={(e) => setShowInNav(e.target.checked)} />}
              label="Show in the site navigation"
            />
            {showInNav && (
              <TextField
                label="Navigation label (optional)"
                value={navLabel}
                onChange={(e) => setNavLabel(e.target.value)}
                placeholder={title || 'Same as title'}
                fullWidth
                helperText="A shorter name for the menu bar, if the title is long."
              />
            )}
            <div>
              <FormControlLabel
                control={
                  <Switch
                    checked={isSystem || published}
                    onChange={(e) => setPublished(e.target.checked)}
                    disabled={isSystem}
                  />
                }
                label="Published"
              />
              <Typography variant="body2" sx={{ color: 'text.secondary', ml: 6.5 }}>
                {isSystem
                  ? 'Built-in pages are always published.'
                  : published
                    ? 'Visible to everyone.'
                    : 'Draft: only visible to logged-in staff.'}
              </Typography>
            </div>

            <Divider />
            <Typography variant="subtitle2">Search engines (optional)</Typography>

            <TextField
              label="SEO title"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder={page?.system_key === 'home' ? seo.title : formatPageTitle(title || 'Page', seo.title)}
              fullWidth
              helperText={
                <FieldHint value={seoTitle} limit={SEO_LIMITS.title}>
                  Replaces the default browser tab / search result title for this page.
                </FieldHint>
              }
              slotProps={{ formHelperText: { component: 'div' }, htmlInput: { maxLength: 120 } }}
            />
            <TextField
              label="SEO description"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder={seo.description}
              multiline
              minRows={2}
              fullWidth
              helperText={
                <FieldHint value={seoDescription} limit={SEO_LIMITS.description}>
                  Leave empty to use the site-wide description.
                </FieldHint>
              }
              slotProps={{ formHelperText: { component: 'div' }, htmlInput: { maxLength: 320 } }}
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {isNew && (
            <Button onClick={() => save({ editContent: true })} disabled={busy}>
              Create &amp; edit content
            </Button>
          )}
          <Button type="submit" variant="contained" loading={busy}>
            {isNew ? 'Create page' : 'Save settings'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
