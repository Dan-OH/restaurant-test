import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import { findUsages } from '../../lib/media'
import { useSite } from '../../lib/site'
import AssetEditor from '../AssetEditor.jsx'
import { useConfirm } from '../confirm'
import { deleteMediaEverywhere } from '../mediaOps'

/** Asset detail dialog on the Assets page: the shared AssetEditor plus Delete. */
export default function MediaDetails({ media, onClose }) {
  const site = useSite()
  const { confirm } = useConfirm()
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const [editorBusy, setEditorBusy] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const busy = editorBusy || deleting

  async function handleDelete() {
    const usages = findUsages(site.content, media.id, { pages: site.pages, sections: site.pageSections })
    const where = usages.length
      ? `It's used in ${usages.length} place${usages.length === 1 ? '' : 's'} (${usages
          .map((u) => `${u.page} · ${u.label}`)
          .join(', ')}) and will be removed from ${usages.length === 1 ? 'it' : 'them'}. `
      : ''
    const confirmed = await confirm({
      title: 'Delete image?',
      message: `${where}The image will be permanently deleted. This can't be undone.`,
      confirmText: media.name || 'delete',
      confirmLabel: 'Delete image',
      danger: true,
    })
    if (!confirmed) return
    setDeleting(true)
    setError(null)
    try {
      await deleteMediaEverywhere(site, media)
      onClose()
    } catch (e) {
      setError(e.message)
      setDeleting(false)
    }
  }

  return (
    <Dialog open onClose={() => !busy && onClose()} fullWidth maxWidth="md" fullScreen={fullScreen}>
      <DialogTitle sx={{ pr: 6 }}>
        <Typography variant="h6" component="span" noWrap sx={{ display: 'block' }}>
          {media.name || 'Untitled image'}
        </Typography>
        <IconButton aria-label="Close" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <AssetEditor key={media.id} media={media} onBusyChange={setEditorBusy} />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, justifyContent: 'space-between' }}>
        <Button color="error" startIcon={<DeleteOutlinedIcon />} onClick={handleDelete} disabled={busy} loading={deleting}>
          Delete
        </Button>
        <Button onClick={onClose} disabled={busy}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}
