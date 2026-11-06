import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import LinkOffIcon from '@mui/icons-material/LinkOff'
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined'
import { useSite } from '../lib/site'
import { formatSize, hashFile, prepareImage, sameShape } from '../lib/images'
import { findUsages } from '../lib/media'
import AdminTheme from './AdminTheme.jsx'
import AssetEditor, { AssetsPageLink } from './AssetEditor.jsx'
import AssetPicker from './AssetPicker.jsx'
import ImageCropper from './ImageCropper.jsx'
import { useConfirm } from './confirm'
import { createMediaFromExisting, createMediaFromFile, mediaSettings, rerenderMedia, sourceUrl } from './mediaOps'

const MAX_BYTES = 10 * 1024 * 1024

/**
 * Edit-mode control for an EditableImage spot: a single "Edit image" button that opens a
 * dialog with the spot's options (upload, choose from Assets, remove) and the same asset
 * editor as the Assets page (crop, alt text, optimize). Dropping a file anywhere on the spot
 * uploads it.
 *
 * `size` ({ width, height }) is what this spot needs: new images are cropped to it, chosen
 * assets of a different shape get a fitted version, and a mismatched image (e.g. after a
 * section's size setting changes) offers "Crop to fit".
 */
export default function ImageControls(props) {
  return (
    <AdminTheme>
      <Controls {...props} />
    </AdminTheme>
  )
}

function Controls({ id, folder, label, media, size }) {
  const site = useSite()
  const { confirm } = useConfirm()
  const anchorRef = useRef(null)
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [editorBusy, setEditorBusy] = useState(false)
  const [error, setError] = useState(null)
  const [picking, setPicking] = useState(false)
  // What the cropper is working on: a newly chosen file, an asset to make a fitted version of,
  // or this spot's own asset being re-cropped to fit.
  const [session, setSession] = useState(null) // { src, file?, hash?, name?, fromAsset?, recrop?, initialArea? }

  // Does this spot's image have the shape the spot needs?
  const mismatch = Boolean(media && size && !sameShape(mediaSettings(media).target, size))

  // Free the object URL created for a newly chosen file.
  useEffect(() => {
    if (!session?.file) return
    return () => URL.revokeObjectURL(session.src)
  }, [session])

  async function handleFile(file) {
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    setOpen(true)
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      // Fingerprint the file as chosen, so re-uploading the same image reuses the stored original.
      const hash = await hashFile(file)
      // Shrink huge photos up front so cropping is smooth and the stored original is reasonable.
      const prepared = await prepareImage(file, { maxWidth: 3200, quality: 0.9 })
      if (prepared.size > MAX_BYTES) throw new Error('That image is too large (max 10 MB).')
      setSession({ src: URL.createObjectURL(prepared), file: prepared, hash, name: file.name })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  // Dropping a file anywhere on the image spot uploads it.
  const handleFileRef = useRef(handleFile)
  useEffect(() => {
    handleFileRef.current = handleFile
  })
  useEffect(() => {
    const spot = anchorRef.current?.parentElement
    if (!spot) return
    const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes('Files')
    function over(e) {
      if (!hasFiles(e)) return
      e.preventDefault()
      spot.classList.add('is-drop-target')
    }
    function leave(e) {
      if (!spot.contains(e.relatedTarget)) spot.classList.remove('is-drop-target')
    }
    function drop(e) {
      const file = e.dataTransfer?.files?.[0]
      spot.classList.remove('is-drop-target')
      if (!file) return
      e.preventDefault()
      handleFileRef.current(file)
    }
    spot.addEventListener('dragover', over)
    spot.addEventListener('dragleave', leave)
    spot.addEventListener('drop', drop)
    return () => {
      spot.removeEventListener('dragover', over)
      spot.removeEventListener('dragleave', leave)
      spot.removeEventListener('drop', drop)
      spot.classList.remove('is-drop-target')
    }
  }, [])

  // Use an existing asset here: as is if it has this spot's shape, otherwise crop a fitted version.
  async function applyAsset(asset) {
    if (size && !sameShape(mediaSettings(asset).target, size)) {
      cropNewFromAsset(asset)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await site.saveText(id, asset.id)
      setPicking(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  // Crop a new version of an existing asset for this spot (reuses its original).
  function cropNewFromAsset(asset) {
    setPicking(false)
    setError(null)
    setSession({ src: sourceUrl(asset), file: null, fromAsset: asset })
  }

  // Make this spot's image fit the spot's size. If it's only used here, re-crop it in place;
  // otherwise make a fitted version for this spot so other places aren't changed.
  function fitToSpot() {
    setError(null)
    const usages = findUsages(site.content, media.id, { pages: site.pages, sections: site.pageSections })
    if (usages.length <= 1) setSession({ src: sourceUrl(media), file: null, recrop: true })
    else cropNewFromAsset(media)
  }

  // Saving the cropper: re-crop this spot's asset, or create a new asset and put it here.
  async function handleCropSave(settings) {
    setBusy(true)
    setError(null)
    try {
      if (session.recrop) {
        await rerenderMedia(site, media, settings)
        setSession(null)
        return
      }
      const created = session.fromAsset
        ? await createMediaFromExisting(site, session.fromAsset, settings, folder)
        : await createMediaFromFile(site, {
            file: session.file,
            src: session.src,
            hash: session.hash,
            settings,
            folder,
            name: session.name,
          })
      await site.saveText(id, created.id)
      setSession(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    const ok = await confirm({
      title: `Remove the ${label}?`,
      message: 'It will be removed from this spot but stays in Assets, so you can use it again or delete it there.',
      confirmLabel: 'Remove',
    })
    if (!ok) return
    setError(null)
    try {
      await site.saveText(id, '')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <>
      <Box ref={anchorRef} sx={{ position: 'absolute', top: 16, right: 16, zIndex: 2, textShadow: 'none' }}>
        <Button
          variant="contained"
          size="small"
          color={mismatch ? 'warning' : 'primary'}
          startIcon={media ? <EditIcon /> : <AddPhotoAlternateIcon />}
          onClick={() => setOpen(true)}
          title={mismatch ? `This image doesn't match the ${formatSize(size)} size this spot uses` : undefined}
          sx={{ boxShadow: 3 }}
        >
          {media ? `Edit ${label}` : `Add ${label}`}
        </Button>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
      </Box>

      {open && (
        <SpotDialog
          label={label}
          media={media}
          size={size}
          mismatch={mismatch}
          onFit={fitToSpot}
          busy={busy || editorBusy}
          preparing={busy && !session}
          error={!session && !picking ? error : null}
          onEditorBusy={setEditorBusy}
          onUpload={() => inputRef.current.click()}
          onDropFile={handleFile}
          onChoose={() => {
            setError(null)
            setPicking(true)
          }}
          onRemove={handleRemove}
          onClose={() => {
            setOpen(false)
            setError(null)
          }}
        />
      )}

      {picking && (
        <AssetPicker
          currentId={media?.id}
          target={size}
          busy={busy}
          error={error}
          onUse={applyAsset}
          onCropNew={cropNewFromAsset}
          onClose={() => setPicking(false)}
        />
      )}

      {session && (
        <ImageCropper
          src={session.src}
          target={size}
          initialArea={null}
          busy={busy}
          error={error}
          onCancel={() => {
            setSession(null)
            setError(null)
          }}
          onSave={handleCropSave}
        />
      )}
    </>
  )
}

function SpotDialog({
  label,
  media,
  size,
  mismatch,
  onFit,
  busy,
  preparing,
  error,
  onEditorBusy,
  onUpload,
  onDropFile,
  onChoose,
  onRemove,
  onClose,
}) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const [dragOver, setDragOver] = useState(false)
  const title = label.charAt(0).toUpperCase() + label.slice(1)

  return (
    <Dialog
      open
      onClose={() => !busy && onClose()}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      aria-labelledby="spot-dialog-title"
    >
      <DialogTitle id="spot-dialog-title" sx={{ pr: 6 }}>
        {title}
        {size && (
          <Typography variant="body2" component="span" sx={{ display: 'block', color: 'text.secondary' }}>
            This spot uses images at {formatSize(size)} pixels.
          </Typography>
        )}
        <IconButton aria-label="Close" onClick={onClose} disabled={busy} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          onDropFile(e.dataTransfer.files?.[0])
        }}
        sx={{ outline: dragOver ? '2px dashed' : 'none', outlineColor: 'primary.main', outlineOffset: -8 }}
      >
        {/* Spot actions: what goes in this spot. */}
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', mb: 2.5 }}>
          <Button
            variant={media ? 'outlined' : 'contained'}
            startIcon={<FileUploadOutlinedIcon />}
            onClick={onUpload}
            disabled={busy}
            loading={preparing}
            loadingPosition="start"
          >
            {media ? 'Upload a new image' : 'Upload an image'}
          </Button>
          <Button variant="outlined" startIcon={<PhotoLibraryOutlinedIcon />} onClick={onChoose} disabled={busy}>
            Choose from Assets
          </Button>
          {media && (
            <Button color="error" startIcon={<LinkOffIcon />} onClick={onRemove} disabled={busy}>
              Remove from this spot
            </Button>
          )}
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {mismatch && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={onFit} disabled={busy}>
                Crop to fit
              </Button>
            }
          >
            This image is cropped to {formatSize(mediaSettings(media).target)}, but this spot uses{' '}
            {formatSize(size)}. Crop it to fit so it isn't cut off unexpectedly.
          </Alert>
        )}

        {media ? (
          <AssetEditor key={media.id} media={media} onBusyChange={onEditorBusy} />
        ) : (
          <Paper
            variant="outlined"
            sx={{ py: 6, px: 2, textAlign: 'center', borderStyle: 'dashed', borderWidth: 2, bgcolor: 'grey.50' }}
          >
            {preparing ? (
              <CircularProgress />
            ) : (
              <>
                <AddPhotoAlternateIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                <Typography variant="h6" component="p">
                  No {label} yet
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Drop an image here, upload one, or choose one you've already uploaded. You'll be able to crop
                  and optimize it next.
                </Typography>
              </>
            )}
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, justifyContent: 'space-between' }}>
        <Box>{media && <AssetsPageLink media={media} />}</Box>
        <Button variant="contained" onClick={onClose} disabled={busy}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}
