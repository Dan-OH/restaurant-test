import { useState } from 'react'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'

export default function SectionForm({ initial = {}, submitLabel = 'Save', onSubmit, onCancel }) {
  const [name, setName] = useState(initial.name ?? '')
  const [description, setDescription] = useState(initial.description ?? '')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await onSubmit({ name: name.trim(), description: description.trim() })
    } catch {
      // Error is shown by the editor; keep the form open.
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack component="form" spacing={1.5} onSubmit={handleSubmit} sx={{ py: 0.5 }}>
      <TextField
        label="Section name"
        size="small"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus
        fullWidth
      />
      <TextField
        label="Description (optional)"
        size="small"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        fullWidth
      />
      <Stack direction="row" spacing={1}>
        <Button type="submit" variant="contained" size="small" loading={busy}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button size="small" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
      </Stack>
    </Stack>
  )
}
