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
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'

const DEFAULT_ASPECTS = [
  { key: '21:9', label: 'Wide 21:9', value: 21 / 9 },
  { key: '16:9', label: 'Landscape 16:9', value: 16 / 9 },
  { key: '3:2', label: 'Classic 3:2', value: 3 / 2 },
  { key: 'original', label: 'Original', value: null }, // uses the image's own shape
]

const DEFAULT_SIZES = [
  { label: 'Small', width: 1200 },
  { label: 'Medium', width: 1600 },
  { label: 'Large', width: 2400 },
  { label: 'Extra large', width: 3200 },
]

/**
 * Dialog for cropping and resizing an image.
 * `initial` restores a previous session: { aspect, area, width }.
 * `onSave` receives { aspect, area, width } where `area` is in source-image pixels
 * and `width` is the output width actually used (never larger than the crop).
 */
export default function ImageCropper({
  src,
  initial,
  aspects = DEFAULT_ASPECTS,
  sizes = DEFAULT_SIZES,
  defaultAspect = '16:9',
  defaultWidth = 2400,
  busy = false,
  error,
  onCancel,
  onSave,
}) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspectKey, setAspectKey] = useState(initial?.aspect ?? defaultAspect)
  const [width, setWidth] = useState(initial?.width ?? defaultWidth)
  const [area, setArea] = useState(null)
  const [natural, setNatural] = useState(null)
  const [mediaError, setMediaError] = useState(false)

  const aspectOption = aspects.find((a) => a.key === aspectKey) ?? aspects[0]
  const aspect =
    aspectOption.value ?? (natural ? natural.naturalWidth / natural.naturalHeight : 16 / 9)

  const cropWidth = area ? Math.round(area.width) : 0
  const outputWidth = Math.min(width, cropWidth || width)
  const outputHeight = area ? Math.round((area.height / area.width) * outputWidth) : 0

  function handleSave() {
    onSave({ aspect: aspectOption.key, area: roundArea(area), width: outputWidth })
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
      <DialogTitle id="cropper-title">Crop &amp; resize</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
          Drag to reposition. Use the slider or scroll to zoom.
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
              initialCroppedAreaPixels={initial?.area}
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

          <div>
            <Typography variant="subtitle2" gutterBottom>
              Shape
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={aspectOption.key}
              onChange={(_, v) => v && setAspectKey(v)}
              aria-label="Crop shape"
              sx={{ flexWrap: 'wrap' }}
            >
              {aspects.map((a) => (
                <ToggleButton key={a.key} value={a.key}>
                  {a.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>

          <div>
            <Typography variant="subtitle2" gutterBottom>
              Size
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={width}
              onChange={(_, v) => v && setWidth(v)}
              aria-label="Output size"
              sx={{ flexWrap: 'wrap' }}
            >
              {sizes.map((s) => (
                <ToggleButton key={s.width} value={s.width} disabled={cropWidth > 0 && s.width > cropWidth}>
                  {s.label}&nbsp;
                  <Box component="span" sx={{ opacity: 0.6 }}>
                    {s.width}px
                  </Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>

          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {area ? `Final image: ${outputWidth} × ${outputHeight}px` : 'Loading image…'}
            {area && width > cropWidth && '. Limited by the crop, since images are never enlarged. Zoom out for larger sizes.'}
          </Typography>

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

function roundArea(a) {
  return {
    x: Math.round(a.x),
    y: Math.round(a.y),
    width: Math.round(a.width),
    height: Math.round(a.height),
  }
}
