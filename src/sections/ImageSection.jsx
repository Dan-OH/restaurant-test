import EditableImage from '../components/EditableImage.jsx'
import EditableText from '../components/EditableText.jsx'
import { SECTION_IMAGE_ASPECTS } from './types'

export default function ImageSection({ prefix, settings }) {
  const full = settings.width === 'full'
  return (
    <figure className={`section-image ${full ? 'is-full' : 'container'}`}>
      <div className="section-media">
        <EditableImage
          id={`${prefix}.image`}
          folder="sections"
          className="section-img"
          label="image"
          placeholder
          aspects={SECTION_IMAGE_ASPECTS}
          defaultAspect={full ? '21:9' : '16:9'}
          defaultWidth={full ? 2400 : 1600}
        />
      </div>
      <EditableText id={`${prefix}.caption`} as="figcaption" placeholder="Caption (optional)" />
    </figure>
  )
}
