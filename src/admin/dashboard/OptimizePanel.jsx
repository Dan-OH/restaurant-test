import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import CompareIcon from '@mui/icons-material/Compare'
import { imageUrl } from '../../lib/api'
import { canEncode, renderImage } from '../../lib/images'
import { formatBytes, formatType } from '../../lib/media'
import { useSite } from '../../lib/site'
import { mediaSettings, renderOptions, rerenderMedia, sourceUrl } from '../mediaOps'
import CompareDialog from './CompareDialog.jsx'

const FORMATS = [
  { value: 'image/webp', label: 'WebP', hint: 'Small files, great for photos. Recommended.' },
  { value: 'image/avif', label: 'AVIF', hint: 'Smallest files; slower to encode.' },
  { value: 'image/jpeg', label: 'JPEG', hint: 'Largest files, but works everywhere.' },
]

/**
 * Re-encodes an image from its original with a chosen format and quality, previewing the
 * resulting file size before applying. The image's dimensions come from where it's used
 * (its target size), so they aren't chosen here.
 */
export default function OptimizePanel({ media, disabled, onApplied }) {
  const site = useSite()
  const current = useMemo(() => mediaSettings(media), [media])
  const formats = useMemo(() => FORMATS.filter((f) => canEncode(f.value)), [])

  const [format, setFormat] = useState(formats.some((f) => f.value === current.format) ? current.format : 'image/webp')
  const [quality, setQuality] = useState(Math.round((current.quality ?? 0.85) * 100))
  const [preview, setPreview] = useState(null) // { result, url, key }
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState(null)
  const [comparing, setComparing] = useState(false)
  const [src] = useState(() => sourceUrl(media))

  const changed = format !== current.format || quality !== Math.round((current.quality ?? 0.85) * 100)
  // Identifies the settings a preview was rendered with, so a stale preview is never applied.
  const settingsKey = `${format}|${quality}`

  // Re-render a preview shortly after settings change, to show the resulting file size.
  useEffect(() => {
    if (!changed) return
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await renderImage(src, renderOptions({ ...current, format, quality: quality / 100 }))
        if (cancelled) return
        setPreview({ result, url: URL.createObjectURL(result.file), key: `${format}|${quality}` })
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 450)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [format, quality, src, changed, current])

  // Free each preview's object URL once it's replaced or the panel closes.
  useEffect(() => () => preview && URL.revokeObjectURL(preview.url), [preview])

  async function apply() {
    setApplying(true)
    setError(null)
    try {
      await rerenderMedia(site, media, { format, quality: quality / 100 }, preview?.result)
      setPreview(null)
      setComparing(false)
      onApplied?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setApplying(false)
    }
  }

  const showPreview = changed && preview?.key === settingsKey && !loading
  const saved = showPreview && media.size ? media.size - preview.result.file.size : 0
  const pct = media.size ? Math.round((saved / media.size) * 100) : 0

  return (
    <Box component="section">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
        <AutoFixHighIcon fontSize="small" color="primary" />
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
          Optimize
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Smaller files load faster. Images are re-encoded from the original, so trying settings never
        reduces quality.
      </Typography>

      <Stack spacing={2}>
        <div>
          <Typography variant="subtitle2" gutterBottom>
            Format
          </Typography>
          <ToggleButtonGroup exclusive size="small" value={format} onChange={(_, v) => v && setFormat(v)}>
            {formats.map((f) => (
              <ToggleButton key={f.value} value={f.value}>
                {f.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography variant="caption" component="p" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {formats.find((f) => f.value === format)?.hint}
          </Typography>
        </div>

        <div>
          <Typography variant="subtitle2" id="quality-label">
            Quality: {quality}%
          </Typography>
          <Slider
            aria-labelledby="quality-label"
            min={40}
            max={100}
            step={1}
            value={quality}
            onChange={(_, v) => setQuality(v)}
            marks={[
              { value: 60, label: 'Smaller' },
              { value: 85, label: 'Balanced' },
              { value: 100, label: 'Best' },
            ]}
            sx={{ mx: 1, width: 'calc(100% - 16px)' }}
          />
        </div>

        <Stack direction="row" spacing={2} sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover', alignItems: 'center' }}>
          {showPreview && <PreviewThumb src={preview.url} onClick={() => setComparing(true)} />}
          <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
            <Typography variant="body2">
              Current: <strong>{formatBytes(media.size)}</strong> · {formatType(media.mime_type)}
              {media.width ? ` · ${media.width}px wide` : ''}
            </Typography>
            {loading && <CircularProgress size={16} />}
            {showPreview && (
              <>
                <Typography variant="body2">
                  → New: <strong>{formatBytes(preview.result.file.size)}</strong> · {formatType(format)} ·{' '}
                  {preview.result.width}px wide
                </Typography>
                {media.size ? (
                  <Chip
                    size="small"
                    color={saved > 0 ? 'success' : 'warning'}
                    label={saved > 0 ? `${pct}% smaller` : `${Math.abs(pct)}% larger`}
                  />
                ) : null}
              </>
            )}
            {!changed && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Change a setting to preview the new size.
              </Typography>
            )}
          </Stack>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <Box>
          <Button
            variant="contained"
            startIcon={<AutoFixHighIcon />}
            onClick={apply}
            loading={applying}
            disabled={disabled || !showPreview}
          >
            Apply optimization
          </Button>
        </Box>
      </Stack>

      {comparing && showPreview && (
        <CompareDialog
          current={{
            src: imageUrl(media.path),
            size: media.size,
            type: media.mime_type,
            width: media.width,
            height: media.height,
          }}
          next={{
            src: preview.url,
            size: preview.result.file.size,
            type: preview.result.file.type,
            width: preview.result.width,
            height: preview.result.height,
          }}
          onClose={() => setComparing(false)}
          onApply={apply}
          applyDisabled={disabled}
          applying={applying}
        />
      )}
    </Box>
  )
}

// Small clickable preview of the optimized image; opens the comparison dialog.
function PreviewThumb({ src, onClick }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-label="Compare current and optimized image"
      title="Compare with current"
      sx={{
        position: 'relative',
        flexShrink: 0,
        width: 112,
        height: 72,
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: 'grey.300',
        '&:hover .compare-overlay, &.Mui-focusVisible .compare-overlay': { opacity: 1 },
      }}
    >
      <Box component="img" src={src} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <Box
        className="compare-overlay"
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.25,
          bgcolor: 'rgba(0, 0, 0, 0.45)',
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          opacity: 0.85,
          transition: 'opacity 0.15s',
        }}
      >
        <CompareIcon fontSize="small" />
        Compare
      </Box>
    </ButtonBase>
  )
}
