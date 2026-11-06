import { lazy, Suspense } from 'react'
import { useSite } from '../lib/site'
import { imageUrl } from '../lib/api'

// Admin-only UI (MUI) is loaded on demand so visitors never download it.
const ImageControls = lazy(() => import('../admin/ImageControls.jsx'))

/**
 * An image placement that can be uploaded, cropped and replaced in edit mode.
 *
 *   <EditableImage id="home.hero.image" folder="hero" className="hero-image" />
 *
 * `id` is the placement key (saved in site_content) and holds a media library id.
 * Start it with the page name ("home.", "menu.") so the file manager can show where it's used.
 * Renders nothing outside edit mode when no image is set. The parent should be
 * position: relative; the edit controls sit in its top-right corner.
 * `size` ({ width, height }) is the size this spot needs, set by the template or section
 * (e.g. the hero is 1920×720). Images are cropped to that shape and scaled to that width.
 * Set `placeholder` to show an empty image box in edit mode until an image is added
 * (for layouts where the image takes up space, like page sections).
 */
export default function EditableImage({ id, folder, className, label = 'image', placeholder = false, size }) {
  const { editing, getText, getMedia } = useSite()
  const media = getMedia(getText(id, ''))

  return (
    <>
      {media && (
        <img
          className={className}
          src={imageUrl(media.path)}
          alt={media.alt}
          width={media.width ?? undefined}
          height={media.height ?? undefined}
        />
      )}
      {editing && !media && placeholder && <div className="image-placeholder">No {label} yet</div>}
      {editing && (
        <Suspense fallback={null}>
          <ImageControls id={id} folder={folder} label={label} media={media} size={size} />
        </Suspense>
      )}
    </>
  )
}
