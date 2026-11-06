import { useState } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { navLabel, pagePath } from '../../lib/pages'
import { usePageMeta } from '../../lib/seo'
import { useSite } from '../../lib/site'
import { useConfirm } from '../confirm'
import { DragHandle, SortableList } from '../SortableList.jsx'
import PageSettingsDialog from './PageSettingsDialog.jsx'

export default function PagesManager() {
  usePageMeta('Pages')
  const site = useSite()
  const { confirm } = useConfirm()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [error, setError] = useState(null)

  const pages = [...site.pages].sort((a, b) => a.nav_order - b.nav_order)
  // ?edit=<id> opens that page's settings; ?edit=new opens the create dialog.
  const editParam = params.get('edit')
  const editing = editParam === 'new' ? 'new' : pages.find((p) => p.id === editParam)

  function openSettings(id) {
    setParams(id ? { edit: id } : {}, { replace: true })
  }

  function editContent(page) {
    site.setEditing(true)
    navigate(pagePath(page))
  }

  function reorder(next) {
    setError(null)
    site.reorderPages(next).catch((e) => setError(`Couldn't save the new order: ${e.message}`))
  }

  async function remove(page) {
    const ok = await confirm({
      title: 'Delete page?',
      message: `"${page.title}" (${pagePath(page)}) and all of its text will be permanently deleted, and it will be removed from the navigation. Images it used stay in Files.`,
      confirmText: page.title,
      confirmLabel: 'Delete page',
      danger: true,
    })
    if (!ok) return
    setError(null)
    try {
      await site.removePage(page)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h4" component="h1">
          Pages
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openSettings('new')}>
          New page
        </Button>
      </Stack>
      <Typography sx={{ color: 'text.secondary' }}>
        Drag pages to set the order they appear in the site navigation.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mt: 3 }}>
        <SortableList
          items={pages}
          gap={12}
          onReorder={reorder}
          renderItem={(page) => (
            <PageRow
              page={page}
              sectionCount={site.sectionsFor(page.id).length}
              onSettings={() => openSettings(page.id)}
              onEditContent={() => editContent(page)}
              onDelete={() => remove(page)}
            />
          )}
        />
      </Box>

      {editing && (
        <PageSettingsDialog
          key={editParam}
          page={editing === 'new' ? null : editing}
          onClose={() => openSettings(null)}
          onSaved={(saved, { editContent: openEditor }) => {
            openSettings(null)
            if (openEditor) editContent(saved)
          }}
        />
      )}
    </Box>
  )
}

function PageRow({ page, sectionCount, onSettings, onEditContent, onDelete }) {
  const path = pagePath(page)
  const label = navLabel(page)

  return (
    <Card variant="outlined">
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 1.5, pr: 2 }}>
        <DragHandle label={`Reorder ${page.title}`} />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {page.title}
            </Typography>
            {page.system_key && <Chip size="small" label="Built-in" />}
            {!page.published && <Chip size="small" color="warning" label="Draft" />}
            {!page.show_in_nav && <Chip size="small" variant="outlined" label="Hidden from navigation" />}
            {page.show_in_nav && label !== page.title && (
              <Chip size="small" variant="outlined" label={`Menu label: ${label}`} />
            )}
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            <Link component={RouterLink} to={path} underline="hover" sx={{ fontFamily: 'monospace' }}>
              {path}
            </Link>
            {` · ${sectionCount} section${sectionCount === 1 ? '' : 's'}`}
            {page.updated_at && ` · Updated ${new Date(page.updated_at).toLocaleDateString()}`}
          </Typography>
        </Box>

        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<EditOutlinedIcon />}
            onClick={onEditContent}
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          >
            Edit content
          </Button>
          <Tooltip title="Edit content">
            <IconButton
              size="small"
              aria-label={`Edit content of ${page.title}`}
              onClick={onEditContent}
              sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Page settings">
            <IconButton size="small" aria-label={`Settings for ${page.title}`} onClick={onSettings}>
              <SettingsOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {!page.system_key && (
            <Tooltip title="Delete page">
              <IconButton size="small" color="error" aria-label={`Delete ${page.title}`} onClick={onDelete}>
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>
    </Card>
  )
}
