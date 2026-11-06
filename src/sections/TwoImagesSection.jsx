import EditableImage from '../components/EditableImage.jsx'
import EditableText from '../components/EditableText.jsx'
import { aspectStyle, parseSize } from './types'

export default function TwoImagesSection({ prefix, settings }) {
  const size = parseSize(settings.imageSize)
  return (
    <div className="container section-two-images">
      {[1, 2].map((n) => (
        <figure key={n}>
          <div className="section-media" style={aspectStyle(size)}>
            <EditableImage
              id={`${prefix}.image${n}`}
              folder="sections"
              className="section-img"
              label="image"
              placeholder
              size={size}
            />
          </div>
          <EditableText id={`${prefix}.caption${n}`} as="figcaption" placeholder="Caption (optional)" />
        </figure>
      ))}
    </div>
  )
}
