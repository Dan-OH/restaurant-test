import { useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloseIcon from '@mui/icons-material/Close'
import CropIcon from '@mui/icons-material/Crop'
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined'
import SearchIcon from '@mui/icons-material/Search'
import { imageUrl } from '../lib/api'
import { formatSize, sameShape } from '../lib/images'
import { findUsages, formatBytes } from '../lib/media'
import { mediaSettings } from './mediaOps'
import { useSite } from '../lib/site'

/**
 * Dialog for picking an existing asset for an image spot that needs `target` ({ width, height }).
 *  - onUse(asset): use it here. Assets with the spot's shape are used as is (shared crop, alt
 *    text and optimization); others open the cropper to make a fitted version.
 *  - onCropNew(asset): crop a new version of it for this spot (shares the original only).
 */
export default function AssetPicker({ currentId, target, busy, error, onUse, onCropNew, onClose }) {
  const site = useSite()
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const assets = useMemo(
    () =>
      Object.values(site.media)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((m) => ({
          ...m,
          fits: !target || sameShape(mediaSettings(m).target, target),
          pages: [
            ...new Set(findUsages(site.content, m.id, { pages: site.pages, sections: site.pageSections }).map((u) => u.page)),
          ],
        })),
    [site.media, site.content, site.pages, site.pageSections, target],
  )

  const q = query.trim().toLowerCase()
  const visible = assets.filter(
    (a) => !q || [a.name, a.alt, ...a.pages].filter(Boolean).some((t) => t.toLowerCase().includes(q)),
  )
  const selected = assets.find((a) => a.id === selectedId)

  return (
    <Dialog
      open
      onClose={() => !busy && onClose()}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      aria-labelledby="asset-picker-title"
    >
      <DialogTitle id="asset-picker-title" sx={{ pr: 6 }}>
        Choose from Assets
        <IconButton aria-label="Close" onClick={onClose} disabled={busy} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {assets.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <PhotoLibraryOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
            <Typography variant="h6" component="p">
              No assets yet
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Upload an image instead; it will be available here next time.
            </Typography>
          </Box>
        ) : (
          <>
            <TextField
              size="small"
              placeholder="Search by name, alt text or page…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              fullWidth
              autoFocus
              sx={{ mb: 2 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
                htmlInput: { 'aria-label': 'Search assets' },
              }}
            />
            <Box
              role="listbox"
              aria-label="Assets"
              sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}
            >
              {visible.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  selected={asset.id === selectedId}
                  current={asset.id === currentId}
                  showFit={Boolean(target)}
                  onSelect={() => setSelectedId(asset.id)}
                  onUse={() => !busy && onUse(asset)}
                />
              ))}
            </Box>
            {visible.length === 0 && (
              <Typography sx={{ color: 'text.secondary', py: 3, textAlign: 'center' }}>No assets match.</Typography>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1, minWidth: 200 }}>
          {!selected
            ? 'Select an image. Double-click to use it straight away.'
            : selected.id === currentId
              ? 'This image is already used here.'
              : selected.fits
                ? '“Use this image” shares its crop and settings with other places it\'s used. “Crop a new version” makes a separate copy for this spot.'
                : `This image is a different shape, so you'll crop a version that fits this spot (${formatSize(target)}).`}
        </Typography>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        {(!selected || selected.fits) && (
          <Button
            variant="outlined"
            startIcon={<CropIcon />}
            disabled={!selected || busy}
            onClick={() => onCropNew(selected)}
          >
            Crop a new version
          </Button>
        )}
        <Button
          variant="contained"
          startIcon={selected && !selected.fits ? <CropIcon /> : undefined}
          loading={busy}
          disabled={!selected || selected.id === currentId}
          onClick={() => onUse(selected)}
        >
          {selected && !selected.fits ? 'Crop to fit' : 'Use this image'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function AssetCard({ asset, selected, current, showFit, onSelect, onUse }) {
  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        borderColor: selected ? 'primary.main' : undefined,
        boxShadow: selected ? (t) => `0 0 0 2px ${t.palette.primary.main}` : 'none',
      }}
    >
      <CardActionArea
        role="option"
        aria-selected={selected}
        onClick={onSelect}
        onDoubleClick={onUse}
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <CardMedia
          component="img"
          image={imageUrl(asset.path)}
          alt={asset.alt}
          loading="lazy"
          sx={{ height: 110, objectFit: 'cover', bgcolor: 'grey.200' }}
        />
        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 }, flex: 1 }}>
          <Typography variant="caption" component="p" noWrap title={asset.name} sx={{ fontWeight: 600 }}>
            {asset.name || 'Untitled image'}
          </Typography>
          <Typography variant="caption" component="p" sx={{ color: 'text.secondary' }}>
            {[asset.width && `${asset.width}×${asset.height}`, formatBytes(asset.size)].filter(Boolean).join(' · ')}
          </Typography>
          <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', mt: 0.5 }}>
            {current && <Chip size="small" color="primary" label="Current" />}
            {showFit && (
              <Chip
                size="small"
                color={asset.fits ? 'success' : 'default'}
                variant="outlined"
                label={asset.fits ? 'Fits this spot' : 'Different shape'}
              />
            )}
            {asset.pages.length ? (
              asset.pages.map((p) => <Chip key={p} size="small" variant="outlined" label={p} />)
            ) : (
              <Chip size="small" label="Not used" />
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
      {selected && (
        <CheckCircleIcon
          color="primary"
          sx={{ position: 'absolute', top: 6, right: 6, bgcolor: '#fff', borderRadius: '50%' }}
        />
      )}
    </Card>
  )
}
