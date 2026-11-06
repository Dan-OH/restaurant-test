import EditableImage from '../components/EditableImage.jsx'
import EditableText from '../components/EditableText.jsx'
import { aspectStyle, parseSize } from './types'

export default function TextImageSection({ prefix, settings }) {
  const size = parseSize(settings.imageSize)
  return (
    <div className={`container section-text-image image-${settings.imagePosition}`}>
      <div className="section-media" style={aspectStyle(size)}>
        <EditableImage id={`${prefix}.image`} folder="sections" className="section-img" label="image" placeholder size={size} />
      </div>
      <div className="section-copy">
        <EditableText id={`${prefix}.heading`} as="h2" placeholder="Heading (optional)" />
        <EditableText id={`${prefix}.body`} as="div" multiline className="section-body" placeholder="Add text…" />
      </div>
    </div>
  )
}
