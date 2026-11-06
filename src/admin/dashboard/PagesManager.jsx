import { useState } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { navStructure } from '../../lib/nav'
import { navLabel, pagePath } from '../../lib/pages'
import { usePageMeta } from '../../lib/seo'
import { useSite } from '../../lib/site'
import { useConfirm } from '../confirm'
import NavTree from './NavTree.jsx'
import PageSettingsDialog from './PageSettingsDialog.jsx'

export default function PagesManager() {
  usePageMeta('Pages')
  const site = useSite()
  const { confirm } = useConfirm()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [error, setError] = useState(null)
  const [groupDialog, setGroupDialog] = useState(null) // { group } to rename, or {} to create

  const pages = site.pages
  const tree = navStructure(pages, site.navGroups)
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

  function arrange(items) {
    setError(null)
    site.arrangeNav(items).catch((e) => setError(`Couldn't save the new arrangement: ${e.message}`))
  }

  async function removePage(page) {
    const ok = await confirm({
      title: 'Delete page?',
      message: `"${page.title}" (${pagePath(page)}) and all of its text will be permanently deleted, and it will be removed from the navigation. Images it used stay in Assets.`,
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

  async function removeGroup(node) {
    const count = node.children.length
    const ok = await confirm({
      title: 'Delete group?',
      message: count
        ? `The "${node.item.title}" group will be deleted. The ${count} item${count === 1 ? '' : 's'} inside it won't be deleted; they'll move up into its place.`
        : `The empty "${node.item.title}" group will be deleted.`,
      confirmText: node.item.title,
      confirmLabel: 'Delete group',
      danger: true,
    })
    if (!ok) return
    setError(null)
    try {
      await site.removeNavGroup(node.item)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <Box sx={{ maxWidth: 960 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 1 }}
      >
        <Typography variant="h4" component="h1">
          Pages
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<CreateNewFolderOutlinedIcon />} onClick={() => setGroupDialog({})}>
            New group
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openSettings('new')}>
            New page
          </Button>
        </Stack>
      </Stack>
      <Typography sx={{ color: 'text.secondary' }}>
        Drag pages and groups to arrange the site navigation. A <strong>group</strong> shows as a dropdown
        (e.g. an “About Us” group holding Contact and Team): drag pages into it, or onto its “Move into…” box.
        Groups can contain other groups.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mt: 3 }}>
        <NavTree
          tree={tree}
          onArrange={arrange}
          renderRow={(node, { handle, dropZone, dimmed }) =>
            node.type === 'group' ? (
              <GroupRow
                group={node.item}
                itemCount={node.children.length}
                handle={handle}
                dropZone={dropZone}
                dimmed={dimmed}
                onRename={() => setGroupDialog({ group: node.item })}
                onDelete={() => removeGroup(node)}
              />
            ) : (
              <PageRow
                page={node.item}
                handle={handle}
                dimmed={dimmed}
                sectionCount={site.sectionsFor(node.item.id).length}
                onSettings={() => openSettings(node.item.id)}
                onEditContent={() => editContent(node.item)}
                onDelete={() => removePage(node.item)}
              />
            )
          }
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

      {groupDialog && (
        <GroupDialog group={groupDialog.group} tree={tree} onClose={() => setGroupDialog(null)} />
      )}
    </Box>
  )
}

function GroupRow({ group, itemCount, handle, dropZone, dimmed, onRename, onDelete }) {
  return (
    <Card
      variant="outlined"
      sx={{ opacity: dimmed ? 0.45 : 1, transition: 'opacity 0.15s', bgcolor: 'action.hover', borderStyle: 'dashed' }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 1.25, pr: 2 }}>
        {handle}
        <FolderOutlinedIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {group.title}
            </Typography>
            <Chip size="small" label="Group" />
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Dropdown in the navigation · {itemCount ? `${itemCount} item${itemCount === 1 ? '' : 's'}` : 'empty: drag pages in'}
          </Typography>
        </Box>
        {dropZone}
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0, display: dropZone ? 'none' : 'flex' }}>
          <Tooltip title="Rename group">
            <IconButton size="small" aria-label={`Rename ${group.title}`} onClick={onRename}>
              <DriveFileRenameOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete group (keeps its pages)">
            <IconButton size="small" color="error" aria-label={`Delete group ${group.title}`} onClick={onDelete}>
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Card>
  )
}

function GroupDialog({ group, tree, onClose }) {
  const site = useSite()
  const [title, setTitle] = useState(group?.title ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const name = title.trim()
    if (!name) return setError('Enter a name.')
    setBusy(true)
    setError(null)
    try {
      if (group) await site.updateNavGroup(group.id, { title: name })
      else await site.addNavGroup({ title: name, parent_id: null, nav_order: tree.length })
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Dialog open onClose={() => !busy && onClose()} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{group ? 'Rename group' : 'New group'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Group name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. About Us"
            autoFocus
            fullWidth
            sx={{ mt: 1 }}
            helperText={
              group
                ? 'Shown as the dropdown’s label in the navigation.'
                : 'Shown as a dropdown in the navigation. It’s added at the bottom of the list; drag pages into it.'
            }
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={busy}>
            {group ? 'Save' : 'Create group'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

function PageRow({ page, handle, dimmed, sectionCount, onSettings, onEditContent, onDelete }) {
  const path = pagePath(page)
  const label = navLabel(page)

  return (
    <Card variant="outlined" sx={{ opacity: dimmed ? 0.45 : 1, transition: 'opacity 0.15s' }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 1.5, pr: 2 }}>
        {handle}

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
