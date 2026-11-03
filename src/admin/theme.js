import { createTheme } from '@mui/material/styles'

// Colors for the dark admin bars (site admin bar and dashboard top bar).
export const BAR_COLOR = '#1f1a17'
export const BAR_EDITING_COLOR = '#2e5e4e'

/**
 * MUI theme for admin UI only (admin bar, editors, dashboard, login).
 * The public site keeps its own SCSS styles in src/styles/.
 */
export const adminTheme = createTheme({
  palette: {
    primary: { main: '#2e5e4e' },
    secondary: { main: '#9c3d2e' },
    background: { default: '#f6f5f3' },
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
  },
})
