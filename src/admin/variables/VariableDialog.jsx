import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { useSite } from '../../lib/site'
import { keyFromLabel, replaceToken, tokenFor, validateVariableKey, variableUsageKeys } from '../../lib/variables'
import { useConfirm } from '../confirm'

/** Create a variable (`variable` omitted) or edit one. Renaming the key updates every use. */
export default function VariableDialog({ variable, onClose }) {
  const site = useSite()
  const { confirm } = useConfirm()
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const isNew = !variable

  const [label, setLabel] = useState(variable?.label ?? '')
  const [key, setKey] = useState(variable?.key ?? '')
  const [keyTouched, setKeyTouched] = useState(!isNew)
  const [value, setValue] = useState(variable?.value ?? '')
  const [description, setDescription] = useState(variable?.description ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const keyError = validateVariableKey(key, site.variableList, variable?.id)
  const labelError = label.trim() ? null : 'Enter a name.'

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    if (keyError || labelError) return

    const renamed = !isNew && key !== variable.key
    const usageKeys = renamed ? variableUsageKeys(site.content, variable.key) : []
    if (renamed && usageKeys.length) {
      const ok = await confirm({
        title: 'Change the key?',
        message: `${tokenFor(variable.key)} is used in ${usageKeys.length} place${usageKeys.length === 1 ? '' : 's'}. They'll all be updated to ${tokenFor(key)}.`,
        confirmLabel: 'Change key',
      })
      if (!ok) return
    }

    setBusy(true)
    setError(null)
    const row = { label: label.trim(), key, value, description: description.trim() || null }
    try {
      if (isNew) {
        await site.addVariable(row)
      } else {
        await site.updateVariable(variable.id, row)
        if (usageKeys.length) {
          await site.saveTexts(
            Object.fromEntries(usageKeys.map((k) => [k, replaceToken(site.content[k], variable.key, tokenFor(key))])),
          )
        }
      }
      onClose()
    } catch (err) {
      setError(err.code === '23505' ? `Another variable already uses "${key}".` : err.message)
      setBusy(false)
    }
  }

  return (
    <Dialog open onClose={() => !busy && onClose()} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{isNew ? 'New variable' : `Edit variable: ${variable.label}`}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <TextField
              label="Name"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value)
                if (!keyTouched) setKey(keyFromLabel(e.target.value))
              }}
              placeholder="e.g. Address"
              required
              autoFocus={isNew}
              fullWidth
              error={submitted && Boolean(labelError)}
              helperText={(submitted && labelError) || 'What this is, shown when picking a variable.'}
            />
            <TextField
              label="Value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              multiline
              minRows={2}
              fullWidth
              helperText="Shown everywhere the variable is used. Line breaks show where the text allows them."
            />
            <TextField
              label="Key"
              value={key}
              onChange={(e) => {
                setKeyTouched(true)
                setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))
              }}
              fullWidth
              error={(submitted || keyTouched) && Boolean(keyError)}
              helperText={
                ((submitted || keyTouched) && keyError) ||
                `Used in text as ${tokenFor(key || 'key')}. Changing it updates every place it's used.`
              }
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">{'{{'}</InputAdornment>,
                  endAdornment: <InputAdornment position="end">{'}}'}</InputAdornment>,
                },
                htmlInput: { spellCheck: false },
              }}
            />
            <TextField
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              helperText="A note for whoever edits this later."
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={busy}>
            {isNew ? 'Create variable' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
