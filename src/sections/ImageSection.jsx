import EditableImage from '../components/EditableImage.jsx'
import EditableText from '../components/EditableText.jsx'
import { aspectStyle, parseSize } from './types'

export default function ImageSection({ prefix, settings }) {
  const full = settings.width === 'full'
  const size = parseSize(settings.size)
  return (
    <figure className={`section-image ${full ? 'is-full' : 'container'}`}>
      <div className="section-media" style={aspectStyle(size)}>
        <EditableImage id={`${prefix}.image`} folder="sections" className="section-img" label="image" placeholder size={size} />
      </div>
      <EditableText id={`${prefix}.caption`} as="figcaption" placeholder="Caption (optional)" />
    </figure>
  )
}
