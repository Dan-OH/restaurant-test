import { Fragment, Suspense } from 'react'
import { useSite } from '../lib/site'
import ErrorBoundary from './ErrorBoundary.jsx'
import { SECTION_COMPONENTS } from '../sections'
import { sectionPrefix, sectionSettings } from '../sections/types'
import { lazyWithReload } from '../lib/lazyWithReload'

// Admin-only editing controls (MUI), loaded the first time edit mode is turned on.
const SectionToolbar = lazyWithReload(() => import('../admin/sections/SectionToolbar.jsx'))
const AddSection = lazyWithReload(() => import('../admin/sections/AddSection.jsx'))

/**
 * Renders a page's sections (see src/sections/). In edit mode, each section gets a toolbar
 * (move, settings, delete) and "Add section" buttons appear between and after sections.
 */
export default function PageSections({ page }) {
  const { editing, sectionsFor } = useSite()
  const sections = sectionsFor(page.id)
  // Fallback pages (database not set up yet) have no real id to attach sections to.
  const canEdit = editing && !String(page.id).startsWith('system-')

  if (!sections.length && !canEdit) return null

  return (
    <div className={`page-sections${canEdit ? ' is-editing' : ''}`}>
      {canEdit && sections.length > 0 && (
        <ErrorBoundary label="An editing control">
          <Suspense fallback={null}>
            <AddSection page={page} index={0} variant="inline" />
          </Suspense>
        </ErrorBoundary>
      )}

      {sections.map((section, i) => (
        <Fragment key={section.id}>
          <Section section={section} index={i} count={sections.length} editing={canEdit} />
          {canEdit && i < sections.length - 1 && (
            <ErrorBoundary label="An editing control">
              <Suspense fallback={null}>
                <AddSection page={page} index={i + 1} variant="inline" />
              </Suspense>
            </ErrorBoundary>
          )}
        </Fragment>
      ))}

      {canEdit && (
        <ErrorBoundary label="An editing control">
          <Suspense fallback={null}>
            <AddSection page={page} index={sections.length} variant="end" />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  )
}

function Section({ section, index, count, editing }) {
  const Component = SECTION_COMPONENTS[section.type]
  // Unknown types (e.g. a layout removed from the code) are hidden from visitors.
  if (!Component && !editing) return null

  return (
    <section id={sectionPrefix(section)} className={`page-section page-section--${section.type}`}>
      {editing && (
        <ErrorBoundary label="An editing control">
          <Suspense fallback={null}>
            <SectionToolbar section={section} index={index} count={count} />
          </Suspense>
        </ErrorBoundary>
      )}
      {Component ? (
        <Component prefix={sectionPrefix(section)} settings={sectionSettings(section)} />
      ) : (
        <div className="container muted">Unknown section type “{section.type}”. It isn't shown to visitors.</div>
      )}
    </section>
  )
}
