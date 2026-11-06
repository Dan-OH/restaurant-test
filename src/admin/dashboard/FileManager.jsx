import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined'
import SearchIcon from '@mui/icons-material/Search'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { imageUrl } from '../../lib/api'
import { findUsages, formatBytes, formatType } from '../../lib/media'
import { usePageMeta } from '../../lib/seo'
import { useSite } from '../../lib/site'
import { usePersistentState } from '../usePersistentState'
import MediaDetails from './MediaDetails.jsx'

const FILTERS = {
  all: { label: 'All', test: () => true },
  used: { label: 'In use', test: (m) => m.usages.length > 0 },
  unused: { label: 'Not used', test: (m) => m.usages.length === 0 },
  noAlt: { label: 'Missing alt text', test: (m) => !m.alt },
}

const byNewest = (a, b) => b.created_at.localeCompare(a.created_at)
const byName = (a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
// Missing values (older images without metadata) always sort last.
const byNumber = (get, dir) => (a, b) => {
  const x = get(a)
  const y = get(b)
  if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1
  return dir * (x - y)
}

const SORTS = {
  newest: { label: 'Newest first', compare: byNewest },
  oldest: { label: 'Oldest first', compare: (a, b) => -byNewest(a, b) },
  edited: { label: 'Recently edited', compare: (a, b) => b.updated_at.localeCompare(a.updated_at) },
  nameAsc: { label: 'Name (A–Z)', compare: byName },
  nameDesc: { label: 'Name (Z–A)', compare: (a, b) => -byName(a, b) },
  largest: { label: 'Largest file', compare: byNumber((m) => m.size, -1) },
  smallest: { label: 'Smallest file', compare: byNumber((m) => m.size, 1) },
  dimensions: { label: 'Largest dimensions', compare: byNumber((m) => (m.width ? m.width * m.height : null), -1) },
  mostUsed: { label: 'Most used', compare: (a, b) => b.usages.length - a.usages.length || byNewest(a, b) },
}

const GROUPINGS = {
  none: { label: 'None' },
  page: { label: 'Page', field: 'page', orderField: 'pageOrder' },
  feature: { label: 'Feature', field: 'feature', orderField: 'featureOrder' },
}

/**
 * Splits items into groups by a usage field (page or feature). An image used in several
 * groups appears in each; unused images go in a "Not used" group at the end.
 */
function groupItems(items, grouping) {
  const g = GROUPINGS[grouping]
  if (!g.field) return [{ key: 'all', title: null, items }]

  const groups = new Map()
  const add = (key, title, order, item) => {
    if (!groups.has(key)) groups.set(key, { key, title, order, items: [] })
    groups.get(key).items.push(item)
  }
  for (const item of items) {
    if (!item.usages.length) {
      add('__unused', 'Not used', Infinity, item)
      continue
    }
    const seen = new Set()
    for (const u of item.usages) {
      if (seen.has(u[g.field])) continue
      seen.add(u[g.field])
      add(u[g.field], u[g.field], u[g.orderField], item)
    }
  }
  return [...groups.values()].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
}

export default function FileManager() {
  usePageMeta('Files')
  const { media, content, pages, pageSections } = useSite()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = usePersistentState('files.sort', 'newest', Object.keys(SORTS))
  const [grouping, setGrouping] = usePersistentState('files.grouping', 'page', Object.keys(GROUPINGS))
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [params, setParams] = useSearchParams()
  const openId = params.get('image')

  const items = useMemo(
    () =>
      Object.values(media).map((m) => ({
        ...m,
        usages: findUsages(content, m.id, { pages, sections: pageSections }),
      })),
    [media, content, pages, pageSections],
  )

  const query = search.trim().toLowerCase()
  const visible = items
    .filter(FILTERS[filter].test)
    .filter(
      (m) =>
        !query ||
        [m.name, m.alt, ...m.usages.flatMap((u) => [u.page, u.feature, u.label])]
          .filter(Boolean)
          .some((text) => text.toLowerCase().includes(query)),
    )
    .sort(SORTS[sort].compare)
  const groups = groupItems(visible, grouping)

  const totalSize = items.reduce((sum, m) => sum + (m.size || 0), 0)
  const open = items.find((m) => m.id === openId)

  function setOpen(id) {
    setParams(id ? { image: id } : {}, { replace: true })
  }

  function toggleGroup(key) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
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

      {items.length === 0 ? (
        <EmptyLibrary />
      ) : (
        <>
          {/* Toolbar */}
          <Stack spacing={2} sx={{ mt: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
              <TextField
                size="small"
                placeholder="Search by name, alt text, page…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ flex: 1, minWidth: 220 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                  htmlInput: { 'aria-label': 'Search images' },
                }}
              />
              <TextField
                select
                size="small"
                label="Sort by"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                {Object.entries(SORTS).map(([key, s]) => (
                  <MenuItem key={key} value={key}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  Group by
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={grouping}
                  onChange={(_, v) => v && setGrouping(v)}
                  aria-label="Group images by"
                >
                  {Object.entries(GROUPINGS).map(([key, g]) => (
                    <ToggleButton key={key} value={key}>
                      {g.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Stack>
            </Stack>

            <ToggleButtonGroup
              exclusive
              size="small"
              value={filter}
              onChange={(_, v) => v && setFilter(v)}
              aria-label="Filter images"
              sx={{ flexWrap: 'wrap' }}
            >
              {Object.entries(FILTERS).map(([key, f]) => (
                <ToggleButton key={key} value={key}>
                  {f.label} ({items.filter(f.test).length})
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Stack>

          {visible.length === 0 ? (
            <Typography sx={{ color: 'text.secondary', py: 4 }}>No images match your search or filter.</Typography>
          ) : (
            <Stack spacing={3} sx={{ mt: 3 }}>
              {groups.map((group) => (
                <Box key={group.key} component="section">
                  {group.title && (
                    <GroupHeader
                      group={group}
                      open={!collapsed.has(group.key)}
                      onToggle={() => toggleGroup(group.key)}
                    />
                  )}
                  <Collapse in={!collapsed.has(group.key)}>
                    <MediaGrid items={group.items} onOpen={setOpen} />
                  </Collapse>
                </Box>
              ))}
            </Stack>
          )}
        </>
      )}

      {open && <MediaDetails media={open} usages={open.usages} onClose={() => setOpen(null)} />}
    </Box>
  )
}

function GroupHeader({ group, open, onToggle }) {
  const size = group.items.reduce((sum, m) => sum + (m.size || 0), 0)
  return (
    <ButtonBase
      onClick={onToggle}
      aria-expanded={open}
      sx={{
        width: '100%',
        justifyContent: 'flex-start',
        gap: 1,
        py: 0.75,
        mb: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
        textAlign: 'left',
      }}
    >
      <ExpandMoreIcon
        fontSize="small"
        sx={{ color: 'text.secondary', transition: 'transform 0.2s', transform: open ? 'none' : 'rotate(-90deg)' }}
      />
      <Typography variant="h6" component="h2" sx={{ fontSize: '1.1rem' }}>
        {group.title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {group.items.length} image{group.items.length === 1 ? '' : 's'} · {formatBytes(size)}
      </Typography>
    </ButtonBase>
  )
}

function MediaGrid({ items, onOpen }) {
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
      {items.map((m) => (
        <MediaCard key={m.id} media={m} onOpen={() => onOpen(m.id)} />
      ))}
    </Box>
  )
}

function MediaCard({ media, onOpen }) {
  const pages = [...new Set(media.usages.map((u) => u.page))]
  const features = [...new Set(media.usages.map((u) => u.feature))]

  return (
    <Card variant="outlined">
      <CardActionArea
        onClick={onOpen}
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
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
              <>
                {pages.map((p) => (
                  <Chip key={`p-${p}`} size="small" label={p} color="primary" variant="outlined" />
                ))}
                {features.map((f) => (
                  <Chip key={`f-${f}`} size="small" label={f} variant="outlined" />
                ))}
              </>
            ) : (
              <Chip size="small" label="Not used" />
            )}
            {!media.alt && (
              <Chip
                size="small"
                color="warning"
                variant="outlined"
                icon={<WarningAmberOutlinedIcon />}
                label="No alt text"
              />
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

function EmptyLibrary() {
  return (
    <Paper variant="outlined" sx={{ mt: 3, p: 4, textAlign: 'center' }}>
      <PhotoLibraryOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
      <Typography variant="h6" component="p" sx={{ mt: 1 }}>
        No images yet
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Upload images from the page editor: open the site, click <strong>Edit page</strong>, then use the image
        controls (for example on the homepage hero).
      </Typography>
    </Paper>
  )
}
