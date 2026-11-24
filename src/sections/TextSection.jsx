import EditableText from '../components/EditableText.jsx'

/**
 * Optional heading and formatted text. `settings.width` sets how wide the section is;
 * `settings.columns` = '2' splits the text into two columns under a full-width heading.
 * The second column's text is kept if the section is switched back to one column.
 */
export default function TextSection({ prefix, settings }) {
  const twoColumns = settings.columns === '2'
  return (
    <div className={`section-text width-${settings.width}`}>
      <EditableText id={`${prefix}.heading`} as="h2" placeholder="Heading (optional)" />
      {twoColumns ? (
        <div className="section-columns">
          {/* Wrappers keep each column in its place when the other one is empty. */}
          <div>
            <EditableText id={`${prefix}.body`} as="div" multiline className="section-body" placeholder="Left column…" />
          </div>
          <div>
            <EditableText id={`${prefix}.body2`} as="div" multiline className="section-body" placeholder="Right column…" />
          </div>
        </div>
      ) : (
        <EditableText id={`${prefix}.body`} as="div" multiline className="section-body" placeholder="Add text…" />
      )}
    </div>
  )
}
