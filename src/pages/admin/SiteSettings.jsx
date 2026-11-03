import { useState } from 'react'
import { useSite } from '../../lib/site'
import { SEO_DEFAULTS, SEO_KEYS, SEO_LIMITS, usePageMeta, useSeoSettings } from '../../lib/seo'

export default function SiteSettings() {
  usePageMeta('Dashboard')
  const { saveText } = useSite()
  const saved = useSeoSettings()

  const [title, setTitle] = useState(saved.title)
  const [description, setDescription] = useState(saved.description)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const dirty = title.trim() !== saved.title || description.trim() !== saved.description

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const nextTitle = title.trim() || SEO_DEFAULTS.title
      const nextDescription = description.trim()
      if (nextTitle !== saved.title) await saveText(SEO_KEYS.title, nextTitle)
      if (nextDescription !== saved.description) await saveText(SEO_KEYS.description, nextDescription)
      setTitle(nextTitle)
      setDescription(nextDescription)
      setMessage({ type: 'success', text: 'Settings saved.' })
    } catch (err) {
      setMessage({ type: 'error', text: `Couldn't save: ${err.message}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="settings">
      <h1>Site settings</h1>
      <p className="muted">How your site appears in browser tabs and search results.</p>

      <form className="form card settings-card" onSubmit={handleSubmit}>
        <h2>Search &amp; SEO</h2>

        <label>
          Website title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={SEO_DEFAULTS.title}
            maxLength={120}
          />
          <FieldHint value={title} limit={SEO_LIMITS.title}>
            Shown in the browser tab and as the headline in search results. Other pages show as
            "Menu · {title.trim() || SEO_DEFAULTS.title}".
          </FieldHint>
        </label>

        <label>
          Meta description
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={320}
          />
          <FieldHint value={description} limit={SEO_LIMITS.description}>
            A one- or two-sentence summary search engines may show under your title.
          </FieldHint>
        </label>

        <div className="search-preview" aria-label="Search result preview">
          <p className="search-preview-label">Search preview</p>
          <p className="search-preview-url">{window.location.host}</p>
          <p className="search-preview-title">{truncate(title.trim() || SEO_DEFAULTS.title, SEO_LIMITS.title)}</p>
          <p className="search-preview-description">
            {truncate(description.trim(), SEO_LIMITS.description) || (
              <span className="muted">No description yet.</span>
            )}
          </p>
        </div>

        {message && <p className={message.type === 'error' ? 'error' : 'success'}>{message.text}</p>}

        <div className="form-actions">
          <button className="button" disabled={busy || !dirty}>
            {busy ? 'Saving…' : 'Save settings'}
          </button>
          {dirty && !busy && (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setTitle(saved.title)
                setDescription(saved.description)
                setMessage(null)
              }}
            >
              Discard changes
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

function FieldHint({ value, limit, children }) {
  const length = value.trim().length
  return (
    <span className="field-hint">
      <span>{children}</span>
      <span className={length > limit ? 'over-limit' : undefined}>
        {length}/{limit}
      </span>
    </span>
  )
}

function truncate(text, limit) {
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text
}
