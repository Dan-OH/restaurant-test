import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import { canEncode, renderImage } from '../../lib/images'
import { formatBytes, formatType } from '../../lib/media'
import { useSite } from '../../lib/site'
import { mediaSettings, rerenderMedia, sourceUrl } from '../mediaOps'

const FORMATS = [
  { value: 'image/webp', label: 'WebP', hint: 'Small files, great for photos. Recommended.' },
  { value: 'image/avif', label: 'AVIF', hint: 'Smallest files; slower to encode.' },
  { value: 'image/jpeg', label: 'JPEG', hint: 'Largest files, but works everywhere.' },
]
const WIDTHS = [800, 1200, 1600, 2400, 3200]

/**
 * Re-encodes an image from its original with a chosen format, quality and maximum width,
 * previewing the resulting file size before applying.
 */
export default function OptimizePanel({ media, disabled, onApplied }) {
  const site = useSite()
  const current = useMemo(() => mediaSettings(media), [media])
  const formats = useMemo(() => FORMATS.filter((f) => canEncode(f.value)), [])

  // Widest output possible: the crop area, or the whole original.
  const maxWidth = Math.round(current.area?.width || media.original_width || media.width || 3200)
  const widths = [...new Set([...WIDTHS.filter((w) => w < maxWidth), maxWidth])]

  const [format, setFormat] = useState(formats.some((f) => f.value === current.format) ? current.format : 'image/webp')
  const [quality, setQuality] = useState(Math.round((current.quality ?? 0.85) * 100))
  const [width, setWidth] = useState(Math.min(current.width || maxWidth, maxWidth))
  const [preview, setPreview] = useState(null) // { result, url, key }
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState(null)
  const [src] = useState(() => sourceUrl(media))

  const changed =
    format !== current.format || quality !== Math.round((current.quality ?? 0.85) * 100) || width !== current.width
  // Identifies the settings a preview was rendered with, so a stale preview is never applied.
  const settingsKey = `${format}|${quality}|${width}`

  // Re-render a preview shortly after settings change, to show the resulting file size.
  useEffect(() => {
    if (!changed) return
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await renderImage(src, { ...current, format, quality: quality / 100, width })
        if (cancelled) return
        setPreview({ result, url: URL.createObjectURL(result.file), key: `${format}|${quality}|${width}` })
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
  }, [format, quality, width, src, changed, current])

  // Free each preview's object URL once it's replaced or the panel closes.
  useEffect(() => () => preview && URL.revokeObjectURL(preview.url), [preview])

  async function apply() {
    setApplying(true)
    setError(null)
    try {
      await rerenderMedia(site, media, { format, quality: quality / 100, width }, preview?.result)
      setPreview(null)
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

        <div>
          <Typography variant="subtitle2" gutterBottom>
            Maximum width
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={width}
            onChange={(_, v) => v && setWidth(v)}
            sx={{ flexWrap: 'wrap' }}
          >
            {widths.map((w) => (
              <ToggleButton key={w} value={w}>
                {w === maxWidth ? `Full (${w}px)` : `${w}px`}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>

        <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
          <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
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
                <Link href={preview.url} target="_blank" rel="noreferrer" variant="body2">
                  View full size
                </Link>
              </>
            )}
            {!changed && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Change a setting to preview the new size.
              </Typography>
            )}
          </Stack>
        </Box>

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
    </Box>
  )
}
