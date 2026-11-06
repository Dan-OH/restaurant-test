import TextSection from './TextSection.jsx'
import TextImageSection from './TextImageSection.jsx'
import ImageSection from './ImageSection.jsx'
import TwoImagesSection from './TwoImagesSection.jsx'

/**
 * The component that renders each section type in ./types.js.
 * Components receive { prefix, settings }: use `${prefix}.<field>` as the id for each
 * EditableText / EditableImage, and `settings` (defaults filled in) for layout options.
 */
export const SECTION_COMPONENTS = {
  text: TextSection,
  textImage: TextImageSection,
  image: ImageSection,
  twoImages: TwoImagesSection,
}
