import { useCallback, useMemo, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { ConfirmContext } from './confirm'

/** Provides useConfirm() (see confirm.js). Included in <AdminTheme>. */
export default function ConfirmProvider({ children }) {
  // { options, resolve } for the dialog being shown; kept until the close animation ends.
  const [request, setRequest] = useState(null)
  const [open, setOpen] = useState(false)
  const nextId = useRef(0)

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        nextId.current += 1
        setRequest({ options, resolve, id: nextId.current })
        setOpen(true)
      }),
    [],
  )

  const alert = useCallback((options) => confirm({ ...options, alertOnly: true }).then(() => undefined), [confirm])

  const value = useMemo(() => ({ confirm, alert }), [confirm, alert])

  function close(result) {
    request?.resolve(result)
    setOpen(false)
  }

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request && (
        <ConfirmDialog
          // Remount per request so the typed confirmation starts empty each time.
          key={request.id}
          open={open}
          {...request.options}
          onClose={close}
          onExited={() => setRequest(null)}
        />
      )}
    </ConfirmContext.Provider>
  )
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  danger = false,
  confirmText,
  alertOnly = false,
  onClose,
  onExited,
}) {
  const [typed, setTyped] = useState('')
  const needsTyping = Boolean(confirmText)
  // Forgiving match: ignore surrounding whitespace and letter case.
  const matches = !needsTyping || typed.trim().toLowerCase() === confirmText.trim().toLowerCase()
  const label = confirmLabel ?? (alertOnly ? 'OK' : danger ? 'Delete' : 'Confirm')

  function handleSubmit(e) {
    e.preventDefault()
    if (matches) onClose(true)
  }

  return (
    <Dialog
      open={open}
      onClose={() => onClose(false)}
      maxWidth="xs"
      fullWidth
      aria-labelledby="confirm-dialog-title"
      slotProps={{ transition: { onExited } }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
        <DialogContent>
          {message &&
            (typeof message === 'string' ? <DialogContentText>{message}</DialogContentText> : message)}

          {needsTyping && (
            <Box sx={{ mt: message ? 2.5 : 0 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                To confirm, type{' '}
                <Box
                  component="code"
                  sx={{
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 0.5,
                    bgcolor: 'action.hover',
                    fontWeight: 600,
                    userSelect: 'all', // one click selects it, ready to copy and paste
                    wordBreak: 'break-all',
                  }}
                >
                  {confirmText}
                </Box>{' '}
                below.
              </Typography>
              <TextField
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={confirmText}
                autoFocus
                fullWidth
                size="small"
                autoComplete="off"
                slotProps={{ htmlInput: { spellCheck: false, 'aria-label': `Type ${confirmText} to confirm` } }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {!alertOnly && <Button onClick={() => onClose(false)}>{cancelLabel}</Button>}
          <Button
            type="submit"
            variant="contained"
            color={danger ? 'error' : 'primary'}
            disabled={!matches}
            autoFocus={!needsTyping}
          >
            {label}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
