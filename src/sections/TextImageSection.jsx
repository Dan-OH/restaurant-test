import EditableImage from '../components/EditableImage.jsx'
import EditableText from '../components/EditableText.jsx'
import { SECTION_IMAGE_ASPECTS } from './types'

export default function TextImageSection({ prefix, settings }) {
  return (
    <div className={`container section-text-image image-${settings.imagePosition}`}>
      <div className="section-media">
        <EditableImage
          id={`${prefix}.image`}
          folder="sections"
          className="section-img"
          label="image"
          placeholder
          aspects={SECTION_IMAGE_ASPECTS}
          defaultAspect="4:3"
          defaultWidth={1600}
        />
      </div>
      <div className="section-copy">
        <EditableText id={`${prefix}.heading`} as="h2" placeholder="Heading (optional)" />
        <EditableText id={`${prefix}.body`} as="div" multiline className="section-body" placeholder="Add text…" />
      </div>
    </div>
  )
}
