/**
 * Section layouts available on pages. Metadata only (no React), so the editor, the
 * settings menu and the file manager can all use it. The component that renders each
 * type is registered in ./index.js.
 *
 * To add a layout:
 *   1. Add an entry here (label, description, settings, images).
 *   2. Create its component in this folder and add it to SECTION_COMPONENTS in ./index.js.
 *   3. Add a small schematic for the picker in src/admin/sections/SectionPreview.jsx (optional).
 *   4. Style it in src/styles/_sections.scss.
 *
 * settings: shown in the section's settings menu and saved in page_sections.settings.
 *   { key, label, type: 'choice', options: [{ value, label }], default }
 *   { key, label, type: 'boolean', default }
 * images: the section's image slots ({ field: label }), stored as "section-<id>.<field>".
 */
export const SECTION_TYPES = {
  text: {
    label: 'Text',
    description: 'A heading and a block of text.',
    settings: [
      {
        key: 'align',
        label: 'Text alignment',
        type: 'choice',
        default: 'left',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
        ],
      },
    ],
    images: {},
  },
  textImage: {
    label: 'Text with image',
    description: 'Text beside an image. Choose which side the image goes on.',
    settings: [
      {
        key: 'imagePosition',
        label: 'Image position',
        type: 'choice',
        default: 'right',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
        ],
      },
    ],
    images: { image: 'Image' },
  },
  image: {
    label: 'Image',
    description: 'One large image with an optional caption.',
    settings: [
      {
        key: 'width',
        label: 'Width',
        type: 'choice',
        default: 'contained',
        options: [
          { value: 'contained', label: 'Contained' },
          { value: 'full', label: 'Full width' },
        ],
      },
    ],
    images: { image: 'Image' },
  },
  twoImages: {
    label: 'Two images',
    description: 'Two images side by side, each with an optional caption.',
    settings: [],
    images: { image1: 'Left image', image2: 'Right image' },
  },
}

/** A section's settings with defaults filled in for anything not saved yet. */
export function sectionSettings(section) {
  const type = SECTION_TYPES[section.type]
  const defaults = Object.fromEntries((type?.settings ?? []).map((s) => [s.key, s.default]))
  return { ...defaults, ...(section.settings || {}) }
}

/** Prefix for a section's site_content keys. */
export function sectionPrefix(section) {
  return `section-${section.id}`
}

// Crop shapes offered when adding images to sections.
export const SECTION_IMAGE_ASPECTS = [
  { key: '4:3', label: '4:3', value: 4 / 3 },
  { key: '3:2', label: '3:2', value: 3 / 2 },
  { key: '1:1', label: 'Square', value: 1 },
  { key: '16:9', label: '16:9', value: 16 / 9 },
  { key: '21:9', label: 'Wide 21:9', value: 21 / 9 },
  { key: 'original', label: 'Original', value: null },
]
