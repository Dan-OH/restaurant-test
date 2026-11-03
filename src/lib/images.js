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
 * Renders an image: crops `area` (source pixels; whole image if omitted), scales it to at most
 * `width` pixels wide (never upscales) and encodes it as `format` at `quality` (0–1).
 * Returns { file, width, height }.
 */
export async function renderImage(src, { area, width, format = 'image/webp', quality = 0.85 } = {}) {
  const img = await loadImage(src)
  const a = area ?? { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight }
  const scale = Math.min(1, (width || a.width) / a.width)

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(a.width * scale))
  canvas.height = Math.max(1, Math.round(a.height * scale))

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
