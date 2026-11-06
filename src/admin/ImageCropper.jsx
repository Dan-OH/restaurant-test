import { useState } from 'react'
import Cropper from 'react-easy-crop'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import { formatSize, outputSize } from '../lib/images'

/**
 * Dialog for cropping an image to the size its spot needs.
 *
 * `target` ({ width, height }) comes from where the image is used (e.g. the hero is 1920×720,
 * section images follow the section's size setting). The crop is locked to that shape and the
 * result is scaled down to the target width; smaller images are allowed, with a warning.
 * Without a target (older images) the crop keeps the image's own shape.
 *
 * `initialArea` restores a previous crop. onSave({ area, target }) gets the crop in pixels of
 * the source image.
 */
export default function ImageCropper({ src, target, initialArea, busy = false, error, onCancel, onSave }) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState(null)
  const [natural, setNatural] = useState(null)
  const [mediaError, setMediaError] = useState(false)

  const aspect = target
    ? target.width / target.height
    : natural
      ? natural.naturalWidth / natural.naturalHeight
      : 16 / 9
  const output = area ? outputSize(target, area) : null

  function handleSave() {
    onSave({
      area: {
        x: Math.round(area.x),
        y: Math.round(area.y),
        width: Math.round(area.width),
        height: Math.round(area.height),
      },
      target,
    })
  }

  return (
    <Dialog
      open
      onClose={() => !busy && onCancel()}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      aria-labelledby="cropper-title"
    >
      <DialogTitle id="cropper-title">Crop image</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
          {target
            ? `This spot uses images at ${formatSize(target)} pixels. Drag to choose what's shown; use the slider or scroll to zoom.`
            : 'Drag to reposition. Use the slider or scroll to zoom.'}
        </Typography>

        <Box
          sx={{
            position: 'relative', // react-easy-crop fills its positioned parent
            height: { xs: 280, sm: 420 },
            borderRadius: 1,
            overflow: 'hidden',
            bgcolor: '#1f1a17',
          }}
        >
          {mediaError ? (
            <Alert severity="error" sx={{ m: 2 }}>
              This image couldn't be loaded for editing.
            </Alert>
          ) : (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              maxZoom={4}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
              onMediaLoaded={setNatural}
              initialCroppedAreaPixels={initialArea ?? undefined}
              mediaProps={{ crossOrigin: 'anonymous', onError: () => setMediaError(true) }}
            />
          )}
        </Box>

        <Stack spacing={2} sx={{ mt: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <ZoomOutIcon sx={{ color: 'text.secondary' }} />
            <Slider
              aria-label="Zoom"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(_, v) => setZoom(v)}
            />
            <ZoomInIcon sx={{ color: 'text.secondary' }} />
          </Stack>

          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {output ? `Final image: ${formatSize(output)} pixels` : 'Loading image…'}
          </Typography>

          {output?.tooSmall && (
            <Alert severity="warning">
              This image is smaller than {formatSize(target)} at this crop, so it may look blurry on the site.
              {zoom > 1 ? ' Zooming out uses more of the image.' : ' A larger image will look sharper.'}
            </Alert>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} loading={busy} disabled={!area || mediaError}>
          Save image
        </Button>
      </DialogActions>
    </Dialog>
  )
}
