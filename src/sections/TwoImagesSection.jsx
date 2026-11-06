import EditableImage from '../components/EditableImage.jsx'
import EditableText from '../components/EditableText.jsx'
import { SECTION_IMAGE_ASPECTS } from './types'

export default function TwoImagesSection({ prefix }) {
  return (
    <div className="container section-two-images">
      {[1, 2].map((n) => (
        <figure key={n}>
          <div className="section-media">
            <EditableImage
              id={`${prefix}.image${n}`}
              folder="sections"
              className="section-img"
              label="image"
              placeholder
              aspects={SECTION_IMAGE_ASPECTS}
              defaultAspect="4:3"
              defaultWidth={1200}
            />
          </div>
          <EditableText id={`${prefix}.caption${n}`} as="figcaption" placeholder="Caption (optional)" />
        </figure>
      ))}
    </div>
  )
}
