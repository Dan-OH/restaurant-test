import { lazy } from 'react'

const RELOADED_AT = 'lazy-reload-at'

/**
 * React.lazy that recovers when a code file can't be loaded because the page is out of date:
 * after a new deploy (old file names are gone) or, in development, after Vite re-bundles
 * dependencies ("Outdated Optimize Dep"). It reloads the page once to pick up the current
 * files; if loading fails again straight after a reload, the error is passed on as usual.
 */
export function lazyWithReload(importer) {
  return lazy(async () => {
    try {
      return await importer()
    } catch (error) {
      let last = 0
      try {
        last = Number(sessionStorage.getItem(RELOADED_AT)) || 0
      } catch {
        // Storage blocked: fall through and reload anyway (the timestamp guard is best-effort).
      }
      if (Date.now() - last > 15000) {
        try {
          sessionStorage.setItem(RELOADED_AT, String(Date.now()))
        } catch {
          // ignore
        }
        window.location.reload()
        return new Promise(() => {}) // keep showing the fallback until the reload happens
      }
      throw error
    }
  })
}
