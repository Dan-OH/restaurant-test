import EditableText from '../components/EditableText.jsx'

export default function TextSection({ prefix, settings }) {
  return (
    <div className={`container section-text align-${settings.align}`}>
      <EditableText id={`${prefix}.heading`} as="h2" placeholder="Heading (optional)" />
      <EditableText id={`${prefix}.body`} as="div" multiline className="section-body" placeholder="Add text…" />
    </div>
  )
}
