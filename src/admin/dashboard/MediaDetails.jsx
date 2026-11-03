import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import CropIcon from '@mui/icons-material/Crop'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { imageUrl } from '../../lib/api'
import { formatBytes, formatType } from '../../lib/media'
import { useSite } from '../../lib/site'
import ImageCropper from '../ImageCropper.jsx'
import { deleteMediaEverywhere, mediaSettings, rerenderMedia, sourceUrl } from '../mediaOps'
import OptimizePanel from './OptimizePanel.jsx'
import { useConfirm } from '../confirm'

export default function MediaDetails({ media, usages, onClose }) {
  const site = useSite()
  const { confirm } = useConfirm()
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const [alt, setAlt] = useState(media.alt)
  const [cropping, setCropping] = useState(null) // { src, initial }
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const altDirty = alt.trim() !== media.alt

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

  async function handleDelete() {
    const where = usages.length
      ? `It's used in ${usages.length} place${usages.length === 1 ? '' : 's'} (${usages
          .map((u) => `${u.page} · ${u.label}`)
          .join(', ')}) and will be removed from ${usages.length === 1 ? 'it' : 'them'}. `
      : ''
    const confirmed = await confirm({
      title: 'Delete image?',
      message: `${where}The image and its original file will be permanently deleted. This can't be undone.`,
      confirmText: media.name || 'delete',
      confirmLabel: 'Delete image',
      danger: true,
    })
    if (!confirmed) return
    const ok = await run(() => deleteMediaEverywhere(site, media))
    if (ok) onClose()
  }

  return (
    <>
      <Dialog open onClose={() => !busy && onClose()} fullWidth maxWidth="md" fullScreen={fullScreen}>
        <DialogTitle sx={{ pr: 6 }}>
          <Typography variant="h6" component="span" noWrap sx={{ display: 'block' }}>
            {media.name || 'Untitled image'}
          </Typography>
          <IconButton aria-label="Close" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
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
                <Button
                  size="small"
                  startIcon={<OpenInNewIcon />}
                  href={imageUrl(media.path)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open file
                </Button>
              </Stack>
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

          <OptimizePanel media={media} disabled={busy} onApplied={() => setMessage({ severity: 'success', text: 'Image optimized.' })} />

          {message && (
            <Alert severity={message.severity} sx={{ mt: 2 }} onClose={() => setMessage(null)}>
              {message.text}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5, justifyContent: 'space-between' }}>
          <Button color="error" startIcon={<DeleteOutlinedIcon />} onClick={handleDelete} disabled={busy}>
            Delete
          </Button>
          <Button onClick={onClose} disabled={busy}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {cropping && (
        <ImageCropper
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
