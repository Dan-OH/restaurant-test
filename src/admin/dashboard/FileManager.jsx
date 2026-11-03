import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { imageUrl } from '../../lib/api'
import { findUsages, formatBytes, formatType } from '../../lib/media'
import { usePageMeta } from '../../lib/seo'
import { useSite } from '../../lib/site'
import MediaDetails from './MediaDetails.jsx'

const FILTERS = {
  all: { label: 'All', test: () => true },
  used: { label: 'In use', test: (m) => m.usages.length > 0 },
  unused: { label: 'Not used', test: (m) => m.usages.length === 0 },
  noAlt: { label: 'Missing alt text', test: (m) => !m.alt },
}

export default function FileManager() {
  usePageMeta('Files')
  const { media, content } = useSite()
  const [filter, setFilter] = useState('all')
  const [params, setParams] = useSearchParams()
  const openId = params.get('image')

  const items = useMemo(
    () =>
      Object.values(media)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((m) => ({ ...m, usages: findUsages(content, m.id) })),
    [media, content],
  )
  const visible = items.filter(FILTERS[filter].test)
  const totalSize = items.reduce((sum, m) => sum + (m.size || 0), 0)
  const open = items.find((m) => m.id === openId)

  function setOpen(id) {
    setParams(id ? { image: id } : {}, { replace: true })
  }

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Files
      </Typography>
      <Typography sx={{ color: 'text.secondary' }}>
        {items.length === 0
          ? 'Every image used on the site will appear here.'
          : `${items.length} image${items.length === 1 ? '' : 's'} · ${formatBytes(totalSize)} total`}
      </Typography>

      {items.length > 0 && (
        <ToggleButtonGroup
          exclusive
          size="small"
          value={filter}
          onChange={(_, v) => v && setFilter(v)}
          aria-label="Filter images"
          sx={{ mt: 3, flexWrap: 'wrap' }}
        >
          {Object.entries(FILTERS).map(([key, f]) => (
            <ToggleButton key={key} value={key}>
              {f.label} ({items.filter(f.test).length})
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}

      {items.length === 0 ? (
        <Paper variant="outlined" sx={{ mt: 3, p: 4, textAlign: 'center' }}>
          <PhotoLibraryOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
          <Typography variant="h6" component="p" sx={{ mt: 1 }}>
            No images yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Upload images from the page editor: open the site, click <strong>Edit page</strong>, then use the
            image controls (for example on the homepage hero).
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            mt: 2,
            display: 'grid',
            gap: 2,
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          }}
        >
          {visible.map((m) => (
            <MediaCard key={m.id} media={m} onOpen={() => setOpen(m.id)} />
          ))}
          {visible.length === 0 && (
            <Typography sx={{ color: 'text.secondary', gridColumn: '1 / -1', py: 2 }}>
              No images match this filter.
            </Typography>
          )}
        </Box>
      )}

      {open && <MediaDetails media={open} usages={open.usages} onClose={() => setOpen(null)} />}
    </Box>
  )
}

function MediaCard({ media, onOpen }) {
  const pages = [...new Set(media.usages.map((u) => u.page))]

  return (
    <Card variant="outlined">
      <CardActionArea onClick={onOpen} sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <CardMedia
          component="img"
          image={imageUrl(media.path)}
          alt={media.alt}
          loading="lazy"
          sx={{ height: 150, objectFit: 'cover', bgcolor: 'grey.200' }}
        />
        <CardContent sx={{ flex: 1, p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="subtitle2" noWrap title={media.name}>
            {media.name || 'Untitled image'}
          </Typography>
          <Typography variant="caption" component="p" sx={{ color: 'text.secondary', mb: 1 }}>
            {[media.width && `${media.width}×${media.height}`, formatType(media.mime_type), formatBytes(media.size)]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
          <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {pages.length ? (
              pages.map((p) => <Chip key={p} size="small" label={p} color="primary" variant="outlined" />)
            ) : (
              <Chip size="small" label="Not used" />
            )}
            {!media.alt && (
              <Chip size="small" color="warning" variant="outlined" icon={<WarningAmberOutlinedIcon />} label="No alt text" />
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
