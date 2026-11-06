import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CropIcon from '@mui/icons-material/Crop'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { imageUrl } from '../lib/api'
import { findUsages, formatBytes, formatType } from '../lib/media'
import { useSite } from '../lib/site'
import ImageCropper from './ImageCropper.jsx'
import { mediaSettings, rerenderMedia, sourceUrl } from './mediaOps'
import OptimizePanel from './dashboard/OptimizePanel.jsx'

/**
 * Editing tools for one asset: preview, crop & resize, details, where it's used, alt text and
 * optimization. Shared by the Assets page's detail dialog and the page editor's image dialog,
 * so both work the same way. Render inside a DialogContent; use key={media.id}.
 *
 * `cropperProps` (aspects, defaultAspect…) customise the cropper for the spot being edited.
 * `onBusyChange(busy)` lets the surrounding dialog block closing while something saves.
 */
export default function AssetEditor({ media, cropperProps, onBusyChange }) {
  const site = useSite()
  const [alt, setAlt] = useState(media.alt)
  const [cropping, setCropping] = useState(null) // { src, initial }
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const usages = findUsages(site.content, media.id, { pages: site.pages, sections: site.pageSections })
  const altDirty = alt.trim() !== media.alt

  useEffect(() => {
    onBusyChange?.(busy)
  }, [busy, onBusyChange])

  async function run(fn, success) {
    setBusy(true)
    setMessage(null)
    try {
      await fn()
      if (success) setMessage({ severity: 'success', text: success })
      return true
    } catch (e) {
      setMessage({ severity: 'error', text: e.message })
      return false
    } finally {
      setBusy(false)
    }
  }

  function saveAlt() {
    const next = alt.trim()
    run(() => site.updateMedia(media.id, { alt: next }), 'Alt text saved.').then((ok) => ok && setAlt(next))
  }

  async function saveCrop(settings) {
    const ok = await run(() => rerenderMedia(site, media, settings), 'Crop saved.')
    if (ok) setCropping(null)
  }

  return (
    <>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        {/* Preview */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            component="img"
            src={imageUrl(media.path)}
            alt={media.alt}
            sx={{
              display: 'block',
              width: '100%',
              maxHeight: 360,
              objectFit: 'contain',
              borderRadius: 1,
              bgcolor: 'grey.200',
            }}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<CropIcon />}
              disabled={busy}
              onClick={() =>
                setCropping({ src: sourceUrl(media), initial: media.settings ? mediaSettings(media) : null })
              }
            >
              Crop &amp; resize
            </Button>
            <Button size="small" startIcon={<OpenInNewIcon />} href={imageUrl(media.path)} target="_blank" rel="noreferrer">
              Open file
            </Button>
          </Stack>
          {usages.length > 1 && (
            <Typography variant="caption" component="p" sx={{ color: 'text.secondary', mt: 1 }}>
              Used in {usages.length} places: crop, alt text and optimization changes apply to all of them.
            </Typography>
          )}
        </Box>

        {/* Info */}
        <Stack spacing={2.5} sx={{ width: { md: 300 }, flexShrink: 0 }}>
          <section>
            <Typography variant="subtitle2" gutterBottom>
              Used on
            </Typography>
            {usages.length ? (
              <Stack spacing={0.5}>
                {usages.map((u) => (
                  <Link key={u.key} component={RouterLink} to={u.path} variant="body2">
                    {u.page} · {u.label}
                  </Link>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Not used anywhere on the site.
              </Typography>
            )}
          </section>

          <section>
            <Typography variant="subtitle2" gutterBottom>
              Details
            </Typography>
            <DetailRow label="Dimensions" value={media.width ? `${media.width} × ${media.height}px` : '—'} />
            <DetailRow label="File size" value={formatBytes(media.size)} />
            <DetailRow label="Format" value={formatType(media.mime_type)} />
            <DetailRow
              label="Original"
              value={
                media.original_width
                  ? `${media.original_width} × ${media.original_height}px · ${formatBytes(media.original_size)}`
                  : formatBytes(media.original_size)
              }
            />
            <DetailRow label="Uploaded" value={new Date(media.created_at).toLocaleDateString()} />
            <DetailRow label="Last edited" value={new Date(media.updated_at).toLocaleDateString()} />
          </section>

          <section>
            <TextField
              label="Alt text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Describe the image for screen readers"
              helperText="Used wherever this image appears."
              multiline
              minRows={2}
              fullWidth
              size="small"
            />
            {altDirty && (
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button variant="contained" size="small" onClick={saveAlt} loading={busy}>
                  Save alt text
                </Button>
                <Button size="small" onClick={() => setAlt(media.alt)} disabled={busy}>
                  Cancel
                </Button>
              </Stack>
            )}
          </section>
        </Stack>
      </Stack>

      <Divider sx={{ my: 3 }} />

      <OptimizePanel
        media={media}
        disabled={busy}
        onApplied={() => setMessage({ severity: 'success', text: 'Image optimized.' })}
      />

      {message && (
        <Alert severity={message.severity} sx={{ mt: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {cropping && (
        <ImageCropper
          {...cropperProps}
          src={cropping.src}
          initial={cropping.initial}
          busy={busy}
          error={message?.severity === 'error' ? message.text : null}
          onCancel={() => setCropping(null)}
          onSave={saveCrop}
        />
      )}
    </>
  )
}

function DetailRow({ label, value }) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', py: 0.25 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  )
}

/** Link to an asset on the Assets page. */
export function AssetsPageLink({ media, children = 'Open in Assets' }) {
  return (
    <Link component={RouterLink} to={`/admin/assets?image=${media.id}`} variant="body2">
      {children}
    </Link>
  )
}
