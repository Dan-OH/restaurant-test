import { useEffect, useRef, useState } from 'react'
import { useSite } from '../lib/site'
import { deleteImage, imageUrl, uploadImage } from '../lib/api'
import { cropImage, prepareImage } from '../lib/images'
import ImageCropper from './ImageCropper.jsx'

const MAX_BYTES = 10 * 1024 * 1024

/**
 * An image that can be uploaded, cropped, resized, replaced and removed in edit mode.
 *
 *   <EditableImage id="home.hero.image" folder="hero" className="hero-image" />
 *
 * Stored in site_content:
 *   id             path of the cropped image visitors see
 *   id.original    path of the uncropped original, so the crop can be changed later
 *   id.crop        JSON crop settings ({ aspect, area, width }) to reopen the cropper as left
 *   id.alt         alt text
 *
 * Optional `aspects`, `sizes`, `defaultAspect` and `defaultWidth` are passed to the cropper.
 */
export default function EditableImage({ id, folder, className, label = 'image', defaultAlt = '', ...cropperProps }) {
  const { editing, getText } = useSite()
  const path = getText(id, '')
  const alt = getText(`${id}.alt`, defaultAlt)
  const url = imageUrl(path)

  return (
    <>
      {url && <img className={className} src={url} alt={alt} />}
      {editing && (
        <ImageControls id={id} folder={folder} label={label} path={path} alt={alt} cropperProps={cropperProps} />
      )}
    </>
  )
}

function ImageControls({ id, folder, label, path, alt, cropperProps }) {
  const { getText, saveText, saveTexts, track } = useSite()
  const originalPath = getText(`${id}.original`, '')
  const savedCrop = parseJson(getText(`${id}.crop`, ''))

  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState(null)
  // What the cropper is working on: a newly chosen file, or the stored original.
  const [session, setSession] = useState(null) // { src, file?, initial? }

  // Free the object URL created for a newly chosen file.
  useEffect(() => {
    if (!session?.file) return
    return () => URL.revokeObjectURL(session.src)
  }, [session])

  async function handleFile(file) {
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      // Shrink huge photos up front so cropping is smooth and the stored original is reasonable.
      const prepared = await prepareImage(file, { maxWidth: 3200, quality: 0.9 })
      if (prepared.size > MAX_BYTES) throw new Error('That image is too large (max 10 MB).')
      setSession({ src: URL.createObjectURL(prepared), file: prepared, initial: null })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  function editExisting() {
    setError(null)
    // Images uploaded before cropping existed have no separate original; crop the image itself.
    const source = originalPath || path
    setSession({
      // Unique query string forces a fresh CORS request instead of reusing the cached <img>
      // response, which the canvas would refuse to read.
      src: `${imageUrl(source)}?edit=${Date.now()}`,
      file: null,
      initial: originalPath ? savedCrop : null,
    })
  }

  async function handleCropSave(settings) {
    setBusy(true)
    setError(null)
    const uploaded = []
    try {
      let nextOriginal = originalPath || path
      if (session.file) {
        nextOriginal = await track(() => uploadImage(session.file, `${folder}/originals`))
        uploaded.push(nextOriginal)
      }

      const rendered = await cropImage(session.src, settings.area, settings.width)
      const nextPath = await track(() => uploadImage(rendered, folder))
      uploaded.push(nextPath)

      await saveTexts({
        [id]: nextPath,
        [`${id}.original`]: nextOriginal,
        [`${id}.crop`]: JSON.stringify(settings),
      })

      // Clean up files that are no longer referenced (best effort).
      const keep = new Set([nextPath, nextOriginal])
      for (const old of new Set([path, originalPath])) {
        if (old && !keep.has(old)) deleteImage(old).catch(() => {})
      }
      setSession(null)
    } catch (e) {
      for (const p of uploaded) deleteImage(p).catch(() => {})
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    if (!window.confirm(`Remove the ${label}?`)) return
    setError(null)
    try {
      await saveTexts({ [id]: '', [`${id}.original`]: '', [`${id}.crop`]: '' })
      for (const old of new Set([path, originalPath])) {
        if (old) deleteImage(old).catch(() => {})
      }
    } catch (e) {
      setError(e.message)
    }
  }

  function handleAltBlur(e) {
    const next = e.target.value.trim()
    if (next !== alt) saveText(`${id}.alt`, next).catch((err) => setError(err.message))
  }

  return (
    <>
      <div
        className={`image-controls${dragOver ? ' drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFile(e.dataTransfer.files?.[0])
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div className="image-controls-buttons">
          <button
            type="button"
            className="button small"
            disabled={busy}
            onClick={() => inputRef.current.click()}
          >
            {busy && !session ? 'Preparing…' : path ? `Replace ${label}` : `Add ${label}`}
          </button>
          {path && (
            <button type="button" className="button small secondary on-dark" disabled={busy} onClick={editExisting}>
              Crop &amp; resize
            </button>
          )}
          {path && (
            <button type="button" className="button small secondary on-dark" disabled={busy} onClick={handleRemove}>
              Remove
            </button>
          )}
        </div>
        {path && (
          <label className="image-alt">
            <span>Alt text</span>
            <input
              key={alt}
              defaultValue={alt}
              placeholder="Describe the image for screen readers"
              onBlur={handleAltBlur}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
          </label>
        )}
        {!path && !busy && <span className="image-controls-hint">or drop an image here</span>}
        {error && !session && <p className="image-error">{error}</p>}
      </div>

      {session && (
        <ImageCropper
          {...cropperProps}
          src={session.src}
          initial={session.initial}
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

function parseJson(text) {
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return null
  }
}
