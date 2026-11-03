import { useLayoutEffect, useRef } from 'react'
import { useSite } from '../lib/site'

/**
 * A piece of page text that can be edited in place while edit mode is on.
 *
 *   <EditableText id="home.hero.title" as="h1">Seasonal food, made with care</EditableText>
 *
 * `id` must be unique across the site; it's the key the text is saved under.
 * The children are the default text, shown until someone saves an edit.
 * Set `multiline` to allow line breaks (Enter); otherwise Enter finishes editing.
 */
export default function EditableText({ id, as: Tag = 'span', multiline = false, className, children }) {
  const { editing, getText, saveText } = useSite()
  const fallback = typeof children === 'string' ? children : ''
  const value = getText(id, fallback)
  const classes = [className, multiline && 'multiline'].filter(Boolean).join(' ') || undefined

  if (!editing) return <Tag className={classes}>{value}</Tag>

  return (
    <EditingField
      Tag={Tag}
      className={[classes, 'editable'].filter(Boolean).join(' ')}
      value={value}
      multiline={multiline}
      onSave={(next) => saveText(id, next)}
    />
  )
}

function EditingField({ Tag, className, value, multiline, onSave }) {
  const ref = useRef(null)

  // The DOM owns the text while editing, so React doesn't render children here.
  // Sync from props only when the field isn't being typed in.
  useLayoutEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el && el.innerText !== value) el.innerText = value
  }, [value])

  function commit() {
    const el = ref.current
    let next = el.innerText.replace(/ /g, ' ')
    next = multiline ? next.replace(/\n+$/, '') : next.replace(/\s*\n\s*/g, ' ').trim()
    if (next !== value) onSave(next)
    else el.innerText = value // normalise any stray whitespace
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      ref.current.blur()
    } else if (e.key === 'Escape') {
      ref.current.innerText = value
      ref.current.blur()
    }
  }

  return (
    <Tag
      ref={ref}
      className={className}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck
      role="textbox"
      aria-multiline={multiline || undefined}
      data-placeholder="Click to add text"
      onBlur={commit}
      onKeyDown={handleKeyDown}
      // Keep clicks from following a surrounding link while editing.
      onClick={(e) => e.preventDefault()}
    />
  )
}
