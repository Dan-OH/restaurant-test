import { ThemeProvider } from '@mui/material/styles'
import { adminTheme } from './theme'
import ConfirmProvider from './ConfirmProvider.jsx'

/**
 * Wraps admin UI in the MUI theme and the confirmation dialogs (useConfirm).
 * No CssBaseline, so the public site's styles are untouched.
 */
export default function AdminTheme({ children }) {
  return (
    <ThemeProvider theme={adminTheme}>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ThemeProvider>
  )
}
