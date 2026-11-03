import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import { formatBytes, formatType } from '../../lib/media'

/**
 * Crossfade comparison between the current image and an optimized preview.
 * The two are stacked exactly on top of each other; the slider fades from one to the other.
 *
 * `current` / `next`: { src, size, type, width, height }
 */
export default function CompareDialog({ current, next, onClose, onApply, applyDisabled, applying }) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const [mix, setMix] = useState(100) // 0 = current, 100 = new
  const [zoom, setZoom] = useState('fit') // 'fit' | 'actual'

  const saved = current.size ? current.size - next.size : 0
  const pct = current.size ? Math.round((Math.abs(saved) / current.size) * 100) : 0
  // At 100%, show both at the new image's real pixel size: that's what visitors will get.
  const actualWidth = next.width || current.width

  return (
    <Dialog open onClose={() => !applying && onClose()} maxWidth="lg" fullWidth fullScreen={fullScreen} aria-labelledby="compare-title">
      <DialogTitle id="compare-title" sx={{ pr: 6 }}>
        Compare current and optimized
        <IconButton aria-label="Close" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 2 }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Drag the slider to fade between them. Switch to 100% to check fine detail.
          </Typography>
          <ToggleButtonGroup exclusive size="small" value={zoom} onChange={(_, v) => v && setZoom(v)} aria-label="Zoom">
            <ToggleButton value="fit">Fit</ToggleButton>
            <ToggleButton value="actual">100%</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {/* Stage: the new image sits on top of the current one, faded by the slider. */}
        <Box
          sx={{
            maxHeight: zoom === 'fit' ? 'none' : '60vh',
            overflow: zoom === 'fit' ? 'hidden' : 'auto',
            display: 'flex',
            justifyContent: zoom === 'fit' ? 'center' : 'flex-start',
            borderRadius: 1,
            bgcolor: 'grey.900',
            // Checkerboard so transparent areas are visible.
            backgroundImage:
              'linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
          }}
        >
          <Box sx={{ position: 'relative', display: 'inline-block', lineHeight: 0, flexShrink: 0 }}>
            <Box
              component="img"
              src={current.src}
              alt="Current version"
              sx={
                zoom === 'fit'
                  ? { display: 'block', maxWidth: '100%', maxHeight: '60vh' }
                  : { display: 'block', width: actualWidth, maxWidth: 'none' }
              }
            />
            <Box
              component="img"
              src={next.src}
              alt="Optimized version"
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: mix / 100,
              }}
            />
            <Chip
              size="small"
              label={mix >= 50 ? 'New' : 'Current'}
              sx={{ position: 'absolute', top: 8, left: 8, bgcolor: 'rgba(0,0,0,0.65)', color: '#fff', lineHeight: 1.5 }}
            />
          </Box>
        </Box>

        {/* Crossfade slider with clickable ends. */}
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mt: 2 }}>
          <VersionLabel
            title="Current"
            info={current}
            active={mix < 50}
            onClick={() => setMix(0)}
            align="left"
          />
          <Slider
            aria-label="Crossfade between current and optimized"
            value={mix}
            onChange={(_, v) => setMix(v)}
            min={0}
            max={100}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v}% new`}
            sx={{ flex: 1 }}
          />
          <VersionLabel title="New" info={next} active={mix >= 50} onClick={() => setMix(100)} align="right" />
        </Stack>

        {current.size ? (
          <Typography variant="body2" sx={{ textAlign: 'center', mt: 1 }}>
            {saved >= 0 ? (
              <>
                The new version is <strong>{pct}% smaller</strong> ({formatBytes(saved)} saved).
              </>
            ) : (
              <>
                The new version is <strong>{pct}% larger</strong>. Try lower quality or a smaller width.
              </>
            )}
          </Typography>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose}>Keep editing</Button>
        {onApply && (
          <Button variant="contained" onClick={onApply} disabled={applyDisabled} loading={applying}>
            Apply optimization
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

function VersionLabel({ title, info, active, onClick, align }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-label={`Show ${title.toLowerCase()} version`}
      sx={{
        flexDirection: 'column',
        alignItems: align === 'left' ? 'flex-start' : 'flex-end',
        px: 1,
        py: 0.5,
        borderRadius: 1,
        minWidth: 96,
        textAlign: align,
        bgcolor: active ? 'action.selected' : 'transparent',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Typography variant="subtitle2">{title}</Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.3 }}>
        {formatBytes(info.size)} · {formatType(info.type)}
        {info.width ? (
          <>
            <br />
            {info.width}×{info.height}px
          </>
        ) : null}
      </Typography>
    </ButtonBase>
  )
}
