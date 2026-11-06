import Box from '@mui/material/Box'

/**
 * Helper text with a character counter, for TextField's helperText.
 * Pass slotProps={{ formHelperText: { component: 'div' } }} to the TextField.
 */
export default function FieldHint({ value = '', limit, children }) {
  const length = value.trim().length
  const over = length > limit
  return (
    <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <span>{children}</span>
      <Box
        component="span"
        sx={{ flexShrink: 0, color: over ? 'error.main' : 'inherit', fontWeight: over ? 600 : 'inherit' }}
      >
        {length}/{limit}
      </Box>
    </Box>
  )
}
