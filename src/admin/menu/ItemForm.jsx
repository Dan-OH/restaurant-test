import { useState } from 'react'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'

export default function ItemForm({ initial = {}, submitLabel = 'Save', onSubmit, onCancel }) {
  const [name, setName] = useState(initial.name ?? '')
  const [description, setDescription] = useState(initial.description ?? '')
  const [price, setPrice] = useState(initial.price ?? '')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await onSubmit({ name: name.trim(), description: description.trim(), price })
    } catch {
      // Error is shown by the editor; keep the form open.
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack component="form" spacing={1.5} onSubmit={handleSubmit} sx={{ py: 0.5 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          label="Item name"
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          fullWidth
        />
        <TextField
          label="Price"
          size="small"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          sx={{ width: { sm: 140 }, flexShrink: 0 }}
          slotProps={{
            htmlInput: { min: 0, step: 0.01 },
            input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
          }}
        />
      </Stack>
      <TextField
        label="Description (optional)"
        size="small"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        multiline
        minRows={2}
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
