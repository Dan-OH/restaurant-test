import { createContext, useContext } from 'react'

/**
 * Site-wide editing state:
 *  - editing / setEditing: whether the page is in edit mode (only ever true when logged in)
 *  - getText(key, fallback): the saved text for a key, or the fallback default
 *  - saveText(key, value): persist a text change
 *  - saveTexts({ key: value, ... }): persist several keys in one request
 *  - track(fn): run an async save and reflect it in the admin bar's status
 *  - status: 'idle' | 'saving' | 'saved' | 'error', and statusError
 */
export const SiteContext = createContext(null)

export function useSite() {
  return useContext(SiteContext)
}
