import { useState } from 'react'

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
      // Error is shown by the page; keep the form open.
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form inline-form" onSubmit={handleSubmit}>
      <label>
        Section name
        <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </label>
      <label>
        Description <span className="muted">(optional)</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <div className="form-actions">
        <button className="button" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="button secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
