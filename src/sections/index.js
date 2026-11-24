import TextSection from './TextSection.jsx'
import ImageSection from './ImageSection.jsx'

/**
 * The component that renders each section type in ./types.js.
 * Components receive { prefix, settings }: use `${prefix}.<field>` as the id for each
 * EditableText / EditableImage, and `settings` (defaults filled in) for layout options.
 */
export const SECTION_COMPONENTS = {
  text: TextSection,
  image: ImageSection,
}
