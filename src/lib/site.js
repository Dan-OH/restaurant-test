import { createContext, useContext } from 'react'

/**
 * Site-wide editing state:
 *  - editing / setEditing: whether the page is in edit mode (only ever true when logged in)
 *  - content: all saved page text, { key: value }
 *  - getText(key, fallback): the saved text for a key, or the fallback default
 *  - saveText(key, value): persist a text change
 *  - saveTexts({ key: value, ... }): persist several keys in one request
 *  - media: the media library, { id: row }; getMedia(id) returns one row or null
 *  - addMedia(row) / updateMedia(id, patch) / removeMedia(id): media library changes
 *  - pages: all pages (drafts only when logged in), ordered by nav_order
 *  - addPage(row) / updatePage(id, patch) / removePage(page) / reorderPages(list)
 *  - pageSections: all page sections; sectionsFor(pageId) returns one page's, in order
 *  - addPageSection(pageId, type, index) / updatePageSection(id, patch) /
 *    removePageSection(section) / movePageSection(section, -1 | 1)
 *  - variableList / variables ({ key: variable }): site variables used as {{key}} in text
 *  - addVariable(row) / updateVariable(id, patch) / removeVariable(id)
 *  - track(fn): run an async save and reflect it in the admin bar's status
 *  - status: 'idle' | 'saving' | 'saved' | 'error', and statusError
 */
export const SiteContext = createContext(null)

export function useSite() {
  return useContext(SiteContext)
}
