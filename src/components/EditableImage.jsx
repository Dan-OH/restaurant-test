import { useRef, useState } from 'react'
import { useSite } from '../lib/site'
import { deleteImage, imageUrl, uploadImage } from '../lib/api'
import { prepareImage } from '../lib/images'

const MAX_BYTES = 10 * 1024 * 1024

/**
 * An image that can be uploaded, replaced and removed while edit mode is on.
 *
 *   <EditableImage id="home.hero.image" folder="hero" className="hero-image" />
 *
 * The storage path is saved in site_content under `id`, and the alt text under `${id}.alt`.
 * Renders nothing outside edit mode when no image is set.
 */
export default function EditableImage({ id, folder, className, label = 'image', defaultAlt = '' }) {
  const { editing, getText, saveText, track } = useSite()
  const path = getText(id, '')
  const alt = getText(`${id}.alt`, defaultAlt)
  const url = imageUrl(path)

  return (
    <>
      {url && <img className={className} src={url} alt={alt} />}
      {editing && (
        <ImageControls
          id={id}
          folder={folder}
          label={label}
          path={path}
          alt={alt}
          saveText={saveText}
          track={track}
        />
      )}
    </>
  )
}

function ImageControls({ id, folder, label, path, alt, saveText, track }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState(null)

  async function handleFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const prepared = await prepareImage(file)
      if (prepared.size > MAX_BYTES) throw new Error('That image is too large (max 10 MB).')
      const newPath = await track(() => uploadImage(prepared, folder))
      try {
        await saveText(id, newPath)
      } catch (e) {
        deleteImage(newPath).catch(() => {})
        throw e
      }
      // Best-effort cleanup of the file being replaced.
      if (path) deleteImage(path).catch(() => {})
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemove() {
    if (!window.confirm(`Remove the ${label}?`)) return
    setError(null)
    try {
      await saveText(id, '')
      deleteImage(path).catch(() => {})
    } catch (e) {
      setError(e.message)
    }
  }

  function handleAltBlur(e) {
    const next = e.target.value.trim()
    if (next !== alt) saveText(`${id}.alt`, next).catch((err) => setError(err.message))
  }

  return (
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
          {busy ? 'Uploading…' : path ? `Replace ${label}` : `Add ${label}`}
        </button>
        {path && !busy && (
          <button type="button" className="button small secondary on-dark" onClick={handleRemove}>
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
      {error && <p className="image-error">{error}</p>}
    </div>
  )
}
