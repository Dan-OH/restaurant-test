import Box from '@mui/material/Box'

// Small schematic drawings of each section layout, for the "Add section" picker.
const bar = (width, opts = {}) => (
  <Box sx={{ height: opts.h ?? 6, width, borderRadius: 1, bgcolor: opts.dark ? 'grey.500' : 'grey.300' }} />
)
const image = (sx = {}) => (
  <Box
    sx={{
      bgcolor: 'primary.light',
      opacity: 0.55,
      borderRadius: 1,
      backgroundImage: 'linear-gradient(135deg, transparent 60%, rgba(255,255,255,0.5) 60%)',
      ...sx,
    }}
  />
)
const textLines = (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1, justifyContent: 'center' }}>
    {bar('55%', { h: 9, dark: true })}
    {bar('100%')}
    {bar('90%')}
    {bar('70%')}
  </Box>
)

const PREVIEWS = {
  text: textLines,
  textImage: (
    <Box sx={{ display: 'flex', gap: 1.5, height: '100%' }}>
      {textLines}
      {image({ flex: 1 })}
    </Box>
  ),
  image: image({ height: '100%' }),
  twoImages: (
    <Box sx={{ display: 'flex', gap: 1, height: '100%' }}>
      {image({ flex: 1 })}
      {image({ flex: 1 })}
    </Box>
  ),
}

export default function SectionPreview({ type }) {
  return (
    <Box sx={{ height: 72, p: 1.25, bgcolor: 'grey.100', borderRadius: 1 }}>
      {PREVIEWS[type] ?? textLines}
    </Box>
  )
}
