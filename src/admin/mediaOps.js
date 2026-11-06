import { deleteImage, imageUrl, uploadImage } from '../lib/api'
import { measureImage, renderImage } from '../lib/images'
import { findUsages, removeFromPlacement } from '../lib/media'

/**
 * Media library operations shared by the page editor and the dashboard's file manager.
 * Each takes `site` (from useSite()) so saves show in the admin save status.
 *
 * A media row's `settings` ({ aspect, area, width, format, quality }) describe how `path`
 * was rendered from `original_path`. Changing crop or optimization re-renders from the
 * original, so quality never degrades over repeated edits.
 */

export const DEFAULT_OUTPUT = { format: 'image/webp', quality: 0.85, width: 2400 }

/** URL of the source to render from, safe to draw onto a canvas. */
export function sourceUrl(media) {
  // A unique query string forces a fresh CORS request instead of reusing a cached <img>
  // response, which the canvas would refuse to read.
  return `${imageUrl(media.original_path || media.path)}?edit=${Date.now()}`
}

/** Effective render settings for a media row, filling in defaults for older rows. */
export function mediaSettings(media) {
  return {
    ...DEFAULT_OUTPUT,
    width: media.width || DEFAULT_OUTPUT.width,
    ...(media.settings || {}),
  }
}

/**
 * Uploads a new image: stores the original, renders it with `settings`, and adds a media row.
 * `src` is a URL for `file` (e.g. an object URL). Returns the created row.
 */
export async function createMediaFromFile(site, { file, src, settings, folder, name }) {
  const uploaded = []
  try {
    const full = { ...DEFAULT_OUTPUT, ...settings }
    const original = await measureImage(src)
    const originalPath = await site.track(() => uploadImage(file, `${folder}/originals`))
    uploaded.push(originalPath)

    const rendered = await renderImage(src, full)
    const path = await site.track(() => uploadImage(rendered.file, folder))
    uploaded.push(path)

    return await site.addMedia({
      name: name || file.name || 'image',
      path,
      original_path: originalPath,
      settings: full,
      width: rendered.width,
      height: rendered.height,
      size: rendered.file.size,
      mime_type: rendered.file.type,
      original_width: original.width,
      original_height: original.height,
      original_size: file.size,
    })
  } catch (e) {
    for (const p of uploaded) deleteImage(p).catch(() => {})
    throw e
  }
}

/**
 * Re-renders an existing image with new settings (crop, size, format, quality) and swaps
 * in the new file. Pass `rendered` (from renderImage) to reuse an already-rendered preview.
 */
export async function rerenderMedia(site, media, settings, rendered) {
  const full = { ...mediaSettings(media), ...settings }
  const result = rendered ?? (await renderImage(sourceUrl(media), full))
  const path = await site.track(() => uploadImage(result.file, folderOf(media.path)))

  // Older images have no separate original; the current file becomes the original.
  const originalPath = media.original_path || media.path
  const patch = {
    path,
    original_path: originalPath,
    settings: full,
    width: result.width,
    height: result.height,
    size: result.file.size,
    mime_type: result.file.type,
  }
  if (!media.original_path) {
    patch.original_size = media.size
    if (!media.original_width) {
      const dims = await measureImage(sourceUrl(media)).catch(() => null)
      if (dims) Object.assign(patch, { original_width: dims.width, original_height: dims.height })
    }
  }

  try {
    const updated = await site.updateMedia(media.id, patch)
    if (media.path !== originalPath) deleteImage(media.path).catch(() => {})
    return updated
  } catch (e) {
    deleteImage(path).catch(() => {})
    throw e
  }
}

/** Deletes an image everywhere: clears its placements, removes the row and both files. */
export async function deleteMediaEverywhere(site, media) {
  const usages = findUsages(site.content, media.id)
  // Single-image placements are cleared; multi-image ones (slideshows) just drop this image.
  if (usages.length) {
    await site.saveTexts(
      Object.fromEntries(usages.map((u) => [u.key, removeFromPlacement(site.content[u.key], media.id)])),
    )
  }
  await site.removeMedia(media.id)
  for (const p of new Set([media.path, media.original_path])) {
    if (p) deleteImage(p).catch(() => {})
  }
}

function folderOf(path) {
  const parts = path.split('/')
  parts.pop()
  return parts.filter((p) => p !== 'originals').join('/') || 'library'
}
