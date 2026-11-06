import { createMediaSource, deleteImage, deleteMediaSource, findMediaSource, imageUrl, uploadImage } from '../lib/api'
import { measureImage, outputSize, renderImage } from '../lib/images'
import { findUsages, removeFromPlacement } from '../lib/media'

/**
 * Media library operations shared by the page editor and the dashboard's file manager.
 * Each takes `site` (from useSite()) so saves show in the admin save status.
 *
 * A media row's `settings` describe how `path` was rendered from `original_path`:
 *   target   { width, height } the size the image is for, dictated by where it's used
 *            (e.g. the hero is 1920×720). The crop is locked to this shape and the output is
 *            never wider than target.width.
 *   area     the crop, in pixels of the original
 *   format, quality   encoding (chosen in Optimize)
 * Changing crop or optimization re-renders from the original, so quality never degrades.
 *
 * Originals are shared: each is a row in media_sources, identified by a hash of the uploaded
 * file. Uploading the same file again reuses the stored original (no second upload) while still
 * creating a separate asset with its own crop and settings.
 */

export const DEFAULT_OUTPUT = { format: 'image/webp', quality: 0.85 }

/** URL of the source to render from, safe to draw onto a canvas. */
export function sourceUrl(media) {
  // A unique query string forces a fresh CORS request instead of reusing a cached <img>
  // response, which the canvas would refuse to read.
  return `${imageUrl(media.original_path || media.path)}?edit=${Date.now()}`
}

/**
 * Effective render settings for a media row, filling in defaults for older rows
 * (which get their current dimensions as their target size).
 */
export function mediaSettings(media) {
  const settings = media.settings || {}
  const target =
    settings.target ?? (media.width && media.height ? { width: media.width, height: media.height } : null)
  return { ...DEFAULT_OUTPUT, ...settings, target }
}

/** renderImage options for settings: the crop, encoding and exact output size. */
export function renderOptions(settings) {
  const { area, target, format, quality } = settings
  const size = area ? outputSize(target, area) : { width: target?.width }
  return { area, format, quality, width: size.width, height: size.height }
}

/**
 * Finds the stored original for `hash`, or uploads `file` as a new one.
 * Returns { source, created } where `created` says whether this call uploaded it.
 */
async function getOrCreateSource(site, { file, src, hash, folder }) {
  if (hash) {
    const existing = await findMediaSource(hash)
    if (existing) return { source: existing, created: false }
  }

  const dims = await measureImage(src)
  const path = await site.track(() => uploadImage(file, `${folder}/originals`))
  try {
    const source = await createMediaSource({
      hash: hash || null,
      path,
      width: dims.width,
      height: dims.height,
      size: file.size,
      mime_type: file.type,
    })
    return { source, created: true }
  } catch (e) {
    deleteImage(path).catch(() => {})
    // Someone else stored the same file at the same moment: use theirs.
    if (e.code === '23505' && hash) {
      const existing = await findMediaSource(hash)
      if (existing) return { source: existing, created: false }
    }
    throw e
  }
}

/**
 * Creates a new asset from an uploaded file: reuses or stores its original, renders it with
 * `settings`, and adds a media row. `src` is a URL for `file` (e.g. an object URL); `hash`
 * identifies the uploaded file (see hashFile). Returns the created row.
 */
export async function createMediaFromFile(site, { file, src, hash, settings, folder, name }) {
  const full = { ...DEFAULT_OUTPUT, ...settings } // settings: { area, target }
  const { source, created } = await getOrCreateSource(site, { file, src, hash, folder })
  let renderedPath = null
  try {
    const rendered = await renderImage(src, renderOptions(full))
    renderedPath = await site.track(() => uploadImage(rendered.file, folder))

    return await site.addMedia({
      name: name || file.name || 'image',
      path: renderedPath,
      original_path: source.path,
      source_id: source.id,
      settings: full,
      width: rendered.width,
      height: rendered.height,
      size: rendered.file.size,
      mime_type: rendered.file.type,
      original_width: source.width,
      original_height: source.height,
      original_size: source.size,
    })
  } catch (e) {
    if (renderedPath) deleteImage(renderedPath).catch(() => {})
    if (created) {
      deleteMediaSource(source.id).catch(() => {})
      deleteImage(source.path).catch(() => {})
    }
    throw e
  }
}

/**
 * Creates a new asset from an existing asset's original with new crop/size settings, e.g. to
 * use the same photo in a differently shaped spot. Nothing is uploaded except the new rendered
 * file; the original is shared. Name and alt text are copied. Returns the created row.
 */
export async function createMediaFromExisting(site, asset, settings, folder) {
  const { format, quality } = mediaSettings(asset)
  const full = { format, quality, ...settings } // settings: { area, target }
  const rendered = await renderImage(sourceUrl(asset), renderOptions(full))
  const path = await site.track(() => uploadImage(rendered.file, folder || folderOf(asset.path)))
  try {
    return await site.addMedia({
      name: asset.name,
      alt: asset.alt,
      path,
      original_path: asset.original_path || asset.path,
      source_id: asset.source_id ?? null,
      settings: full,
      width: rendered.width,
      height: rendered.height,
      size: rendered.file.size,
      mime_type: rendered.file.type,
      original_width: asset.original_width,
      original_height: asset.original_height,
      original_size: asset.original_size,
    })
  } catch (e) {
    deleteImage(path).catch(() => {})
    throw e
  }
}

/**
 * Re-renders an existing image with new settings (crop, size, format, quality) and swaps
 * in the new file. Pass `rendered` (from renderImage) to reuse an already-rendered preview.
 */
export async function rerenderMedia(site, media, settings, rendered) {
  const full = { ...mediaSettings(media), ...settings }
  const result = rendered ?? (await renderImage(sourceUrl(media), renderOptions(full)))
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
  if (!media.original_path) patch.original_size = media.size
  // Older assets may not know their original's dimensions yet.
  if (!media.original_width) {
    const dims = await measureImage(sourceUrl(media)).catch(() => null)
    if (dims) Object.assign(patch, { original_width: dims.width, original_height: dims.height })
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
  const usages = findUsages(site.content, media.id, { pages: site.pages, sections: site.pageSections })
  // Single-image placements are cleared; multi-image ones (slideshows) just drop this image.
  if (usages.length) {
    await site.saveTexts(
      Object.fromEntries(usages.map((u) => [u.key, removeFromPlacement(site.content[u.key], media.id)])),
    )
  }
  await site.removeMedia(media.id)

  // The asset's own optimized file (older assets may use their original directly).
  if (media.path !== media.original_path) deleteImage(media.path).catch(() => {})

  // The original is shared: only delete it when no other asset still uses it.
  const original = media.original_path || media.path
  const stillUsed = Object.values(site.media).some(
    (m) =>
      m.id !== media.id &&
      ((media.source_id && m.source_id === media.source_id) || (m.original_path || m.path) === original),
  )
  if (!stillUsed) {
    if (media.source_id) deleteMediaSource(media.source_id).catch(() => {})
    deleteImage(original).catch(() => {})
  }
}

function folderOf(path) {
  const parts = path.split('/')
  parts.pop()
  return parts.filter((p) => p !== 'originals').join('/') || 'library'
}
