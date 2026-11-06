const RESIZABLE = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

/**
 * Shrinks large photos before upload so pages stay fast.
 * Images wider than `maxWidth` are scaled down and re-encoded as WebP; small images,
 * GIFs (may be animated) and anything the browser can't decode are returned unchanged.
 */
export async function prepareImage(file, { maxWidth = 2400, quality = 0.85 } = {}) {
  if (!RESIZABLE.includes(file.type)) return file

  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  const needsResize = bitmap.width > maxWidth
  const needsCompress = file.size > 1.5 * 1024 * 1024
  if (!needsResize && !needsCompress) {
    bitmap.close()
    return file
  }

  const scale = Math.min(1, maxWidth / bitmap.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
  if (!blob || blob.size >= file.size) return file
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // needed to draw Supabase Storage images onto a canvas
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load the image for cropping.'))
    img.src = src
  })
}

/** Natural pixel size of an image URL. */
export async function measureImage(src) {
  const img = await loadImage(src)
  return { width: img.naturalWidth, height: img.naturalHeight }
}

/**
 * Renders an image: crops `area` (source pixels; whole image if omitted) and encodes it as
 * `format` at `quality` (0–1). With `width` and `height`, the output is exactly that size;
 * with only `width`, it's scaled to at most that wide (never upscaled).
 * Returns { file, width, height }.
 */
export async function renderImage(src, { area, width, height, format = 'image/webp', quality = 0.85 } = {}) {
  const img = await loadImage(src)
  const a = area ?? { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight }
  const scale = Math.min(1, (width || a.width) / a.width)

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width && height ? width : a.width * scale))
  canvas.height = Math.max(1, Math.round(width && height ? height : a.height * scale))

  const ctx = canvas.getContext('2d')
  if (format === 'image/jpeg') {
    // JPEG has no transparency; fill white so transparent PNGs don't turn black.
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, a.x, a.y, a.width, a.height, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, format, quality))
  if (!blob) throw new Error('Your browser could not process this image.')
  const ext = blob.type.split('/')[1].replace('jpeg', 'jpg')
  return {
    file: new File([blob], `image.${ext}`, { type: blob.type }),
    width: canvas.width,
    height: canvas.height,
  }
}

const encodeSupport = {}

/** Whether this browser can encode images as `type` (e.g. 'image/avif'). */
export function canEncode(type) {
  if (!(type in encodeSupport)) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    encodeSupport[type] = canvas.toDataURL(type).startsWith(`data:${type}`)
  }
  return encodeSupport[type]
}

/** SHA-256 of a file's bytes as hex, used to recognise the same image uploaded twice. */
export async function hashFile(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Output size for a crop of `area` (source pixels) aimed at `target` ({ width, height }):
 * the target size when the crop is big enough, otherwise the crop's own size at the target's
 * shape (never upscaled). `tooSmall` says the result is smaller than the target.
 */
export function outputSize(target, area) {
  if (!target) {
    return { width: Math.round(area.width), height: Math.round(area.height), tooSmall: false }
  }
  const width = Math.min(target.width, Math.round(area.width))
  return {
    width,
    height: Math.max(1, Math.round((width * target.height) / target.width)),
    tooSmall: width < target.width,
  }
}

/** Whether two sizes have the same shape (aspect ratio), within half a percent. */
export function sameShape(a, b) {
  if (!a?.width || !a?.height || !b?.width || !b?.height) return false
  return Math.abs(a.width / a.height / (b.width / b.height) - 1) < 0.005
}

export function formatSize(size) {
  return size ? `${size.width} × ${size.height}` : ''
}
