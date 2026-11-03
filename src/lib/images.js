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

/**
 * Crops `area` (pixels in the source image) out of `src` and scales it to at most
 * `outputWidth` pixels wide. Never upscales. Returns a WebP File.
 */
export async function cropImage(src, area, outputWidth, { quality = 0.85 } = {}) {
  const img = await loadImage(src)
  const scale = Math.min(1, outputWidth / area.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(area.width * scale))
  canvas.height = Math.max(1, Math.round(area.height * scale))

  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
  if (!blob) throw new Error('Your browser could not process this image.')
  return new File([blob], 'image.webp', { type: 'image/webp' })
}
