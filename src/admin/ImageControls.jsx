import { useEffect, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import CropIcon from '@mui/icons-material/Crop'
import LinkOffIcon from '@mui/icons-material/LinkOff'
import { useSite } from '../lib/site'
import { prepareImage } from '../lib/images'
import AdminTheme from './AdminTheme.jsx'
import ImageCropper from './ImageCropper.jsx'
import { useConfirm } from './confirm'
import { createMediaFromFile, mediaSettings, rerenderMedia, sourceUrl } from './mediaOps'

const MAX_BYTES = 10 * 1024 * 1024

/**
 * Edit-mode panel for an EditableImage placement: upload (with crop), re-crop, alt text,
 * and remove from this placement. Images live in the media library (dashboard → Files).
 */
export default function ImageControls(props) {
  return (
    <AdminTheme>
      <Controls {...props} />
    </AdminTheme>
  )
}

function Controls({ id, folder, label, media, cropperProps }) {
  const site = useSite()
  const { confirm } = useConfirm()
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState(null)
  // What the cropper is working on: a newly chosen file, or the existing media's original.
  const [session, setSession] = useState(null) // { src, file?, name?, initial? }

  // Free the object URL created for a newly chosen file.
  useEffect(() => {
    if (!session?.file) return
    return () => URL.revokeObjectURL(session.src)
  }, [session])

  async function handleFile(file) {
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      // Shrink huge photos up front so cropping is smooth and the stored original is reasonable.
      const prepared = await prepareImage(file, { maxWidth: 3200, quality: 0.9 })
      if (prepared.size > MAX_BYTES) throw new Error('That image is too large (max 10 MB).')
      setSession({ src: URL.createObjectURL(prepared), file: prepared, name: file.name, initial: null })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  function editExisting() {
    setError(null)
    setSession({ src: sourceUrl(media), file: null, initial: media.settings ? mediaSettings(media) : null })
  }

  async function handleCropSave(settings) {
    setBusy(true)
    setError(null)
    try {
      if (session.file) {
        const created = await createMediaFromFile(site, {
          file: session.file,
          src: session.src,
          settings,
          folder,
          name: session.name,
        })
        await site.saveText(id, created.id)
      } else {
        await rerenderMedia(site, media, settings)
      }
      setSession(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    const ok = await confirm({
      title: `Remove the ${label}?`,
      message: 'It will be removed from this page but stays in Files, so you can use it again or delete it there.',
      confirmLabel: 'Remove',
    })
    if (!ok) return
    setError(null)
    try {
      await site.saveText(id, '')
    } catch (e) {
      setError(e.message)
    }
  }

  function handleAltBlur(e) {
    const next = e.target.value.trim()
    if (next !== media.alt) site.updateMedia(media.id, { alt: next }).catch((err) => setError(err.message))
  }

  return (
    <>
      <Paper
        elevation={6}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFile(e.dataTransfer.files?.[0])
        }}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          left: { xs: 16, sm: 'auto' },
          zIndex: 2,
          width: { sm: 340 },
          p: 1.5,
          textAlign: 'left',
          textShadow: 'none',
          outline: dragOver ? '2px dashed' : 'none',
          outlineColor: 'primary.main',
          outlineOffset: 2,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddPhotoAlternateIcon />}
              loading={busy && !session}
              loadingPosition="start"
              disabled={busy}
              onClick={() => inputRef.current.click()}
            >
              {media ? `Replace ${label}` : `Add ${label}`}
            </Button>
            {media && (
              <Button variant="outlined" size="small" startIcon={<CropIcon />} disabled={busy} onClick={editExisting}>
                Crop &amp; resize
              </Button>
            )}
            {media && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<LinkOffIcon />}
                disabled={busy}
                onClick={handleRemove}
              >
                Remove
              </Button>
            )}
          </Stack>

          {media && (
            <TextField
              key={media.alt}
              size="small"
              label="Alt text"
              placeholder="Describe the image for screen readers"
              defaultValue={media.alt}
              onBlur={handleAltBlur}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.querySelector('input')?.blur()}
              fullWidth
            />
          )}
          {media ? (
            <Link component={RouterLink} to={`/admin/files?image=${media.id}`} variant="caption">
              Optimize or see where it's used in Files
            </Link>
          ) : (
            !busy && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                or drop an image here
              </Typography>
            )
          )}
          {error && !session && (
            <Alert severity="error" sx={{ py: 0 }}>
              {error}
            </Alert>
          )}
        </Stack>
      </Paper>

      {session && (
        <ImageCropper
          {...cropperProps}
          src={session.src}
          initial={session.initial}
          busy={busy}
          error={error}
          onCancel={() => {
            setSession(null)
            setError(null)
          }}
          onSave={handleCropSave}
        />
      )}
    </>
  )
}
