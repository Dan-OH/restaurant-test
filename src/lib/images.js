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
