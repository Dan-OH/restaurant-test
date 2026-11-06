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
 *
 * Image sizes: a choice setting whose values are "WIDTHxHEIGHT" (see sizeOption below) sets the
 * size images in that section are cropped to. Components read it with parseSize().
 */

// Size choices for section images, as "WIDTHxHEIGHT" values.
const sizeOption = (width, height, name) => ({ value: `${width}x${height}`, label: `${name} · ${width}×${height}` })
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
        key: 'imageSize',
        label: 'Image size',
        type: 'choice',
        default: '1200x900',
        options: [
          sizeOption(1200, 900, 'Standard 4:3'),
          sizeOption(1200, 800, 'Landscape 3:2'),
          sizeOption(1200, 1200, 'Square'),
          sizeOption(960, 1200, 'Portrait 4:5'),
        ],
      },
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
        key: 'size',
        label: 'Image size',
        type: 'choice',
        default: '1920x1080',
        options: [
          sizeOption(1920, 1080, 'Widescreen 16:9'),
          sizeOption(1920, 820, 'Panorama 21:9'),
          sizeOption(1600, 1200, 'Standard 4:3'),
          sizeOption(1400, 1400, 'Square'),
        ],
      },
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
    settings: [
      {
        key: 'imageSize',
        label: 'Image size',
        type: 'choice',
        default: '1200x900',
        options: [
          sizeOption(1200, 900, 'Standard 4:3'),
          sizeOption(1200, 800, 'Landscape 3:2'),
          sizeOption(1200, 1200, 'Square'),
          sizeOption(960, 1200, 'Portrait 4:5'),
        ],
      },
    ],
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

/** "1920x1080" → { width: 1920, height: 1080 } */
export function parseSize(value) {
  const [width, height] = String(value).split('x').map(Number)
  return width && height ? { width, height } : null
}

/** CSS custom property that sets an image slot's shape, e.g. --aspect: 1920 / 1080. */
export function aspectStyle(size) {
  return size ? { '--aspect': `${size.width} / ${size.height}` } : undefined
}
