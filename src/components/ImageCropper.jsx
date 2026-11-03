import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Cropper from 'react-easy-crop'

const DEFAULT_ASPECTS = [
  { key: '21:9', label: 'Wide 21:9', value: 21 / 9 },
  { key: '16:9', label: 'Landscape 16:9', value: 16 / 9 },
  { key: '3:2', label: 'Classic 3:2', value: 3 / 2 },
  { key: 'original', label: 'Original', value: null }, // uses the image's own shape
]

const DEFAULT_SIZES = [
  { label: 'Small', width: 1200 },
  { label: 'Medium', width: 1600 },
  { label: 'Large', width: 2400 },
  { label: 'Extra large', width: 3200 },
]

/**
 * Modal for cropping and resizing an image.
 * `initial` restores a previous session: { aspect, area, width }.
 * `onSave` receives { aspect, area, width } where `area` is in source-image pixels
 * and `width` is the output width actually used (never larger than the crop).
 */
export default function ImageCropper({
  src,
  initial,
  aspects = DEFAULT_ASPECTS,
  sizes = DEFAULT_SIZES,
  defaultAspect = '16:9',
  defaultWidth = 2400,
  busy = false,
  error,
  onCancel,
  onSave,
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspectKey, setAspectKey] = useState(initial?.aspect ?? defaultAspect)
  const [width, setWidth] = useState(initial?.width ?? defaultWidth)
  const [area, setArea] = useState(null)
  const [natural, setNatural] = useState(null)
  const [mediaError, setMediaError] = useState(false)
  const dialogRef = useRef(null)

  const aspectOption = aspects.find((a) => a.key === aspectKey) ?? aspects[0]
  const aspect =
    aspectOption.value ?? (natural ? natural.naturalWidth / natural.naturalHeight : 16 / 9)

  const cropWidth = area ? Math.round(area.width) : 0
  const outputWidth = Math.min(width, cropWidth || width)
  const outputHeight = area ? Math.round((area.height / area.width) * outputWidth) : 0

  useEffect(() => {
    dialogRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  function handleKeyDown(e) {
    if (e.key === 'Escape' && !busy) onCancel()
  }

  function handleSave() {
    onSave({ aspect: aspectOption.key, area: roundArea(area), width: outputWidth })
  }

  return createPortal(
    <div className="cropper-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div
        className="cropper-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cropper-title"
        tabIndex={-1}
        ref={dialogRef}
        onKeyDown={handleKeyDown}
      >
        <div className="cropper-header">
          <h2 id="cropper-title">Crop &amp; resize</h2>
          <p className="muted">Drag to reposition. Use the slider or scroll to zoom.</p>
        </div>

        <div className="cropper-stage">
          {mediaError ? (
            <p className="error cropper-stage-error">This image couldn't be loaded for editing.</p>
          ) : (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              maxZoom={4}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
              onMediaLoaded={setNatural}
              initialCroppedAreaPixels={initial?.area}
              mediaProps={{ crossOrigin: 'anonymous', onError: () => setMediaError(true) }}
            />
          )}
        </div>

        <div className="cropper-controls">
          <label className="cropper-zoom">
            <span>Zoom</span>
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>

          <fieldset className="cropper-options">
            <legend>Shape</legend>
            <div className="segmented">
              {aspects.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  className={a.key === aspectOption.key ? 'active' : undefined}
                  aria-pressed={a.key === aspectOption.key}
                  onClick={() => setAspectKey(a.key)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="cropper-options">
            <legend>Size</legend>
            <div className="segmented">
              {sizes.map((s) => {
                const tooBig = cropWidth > 0 && s.width > cropWidth
                return (
                  <button
                    key={s.width}
                    type="button"
                    className={s.width === width ? 'active' : undefined}
                    aria-pressed={s.width === width}
                    disabled={tooBig}
                    title={tooBig ? 'Larger than the cropped area. Zoom out to enable.' : undefined}
                    onClick={() => setWidth(s.width)}
                  >
                    {s.label} <span className="muted">{s.width}px</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <p className="cropper-output muted">
            {area ? `Final image: ${outputWidth} × ${outputHeight}px` : 'Loading image…'}
            {area && width > cropWidth && ' (limited by the crop, since images are never enlarged)'}
          </p>
        </div>

        {error && <p className="error cropper-error">{error}</p>}

        <div className="cropper-footer">
          <button type="button" className="button secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="button" onClick={handleSave} disabled={busy || !area || mediaError}>
            {busy ? 'Saving…' : 'Save image'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function roundArea(a) {
  return {
    x: Math.round(a.x),
    y: Math.round(a.y),
    width: Math.round(a.width),
    height: Math.round(a.height),
  }
}
