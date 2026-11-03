import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SiteContext } from './site'
import { useAuth } from './useAuth'
import * as api from './api'

export function SiteProvider({ children }) {
  const { session } = useAuth()
  const [editingFlag, setEditing] = useState(false)
  const [content, setContent] = useState(null)
  const [media, setMedia] = useState(null) // { [id]: row }
  const [status, setStatus] = useState('idle')
  const [statusError, setStatusError] = useState(null)
  const pending = useRef(0)

  // Edit mode can never be on for a signed-out visitor.
  const editing = Boolean(session) && editingFlag

  useEffect(() => {
    api
      .fetchContent()
      .then(setContent)
      .catch((e) => {
        console.error('Could not load site content, using defaults:', e.message)
        setContent({})
      })
    api
      .fetchMedia()
      .then((rows) => setMedia(Object.fromEntries(rows.map((m) => [m.id, m]))))
      .catch((e) => {
        console.error('Could not load media library:', e.message)
        setMedia({})
      })
  }, [])

  const track = useCallback(async (fn) => {
    pending.current += 1
    setStatus('saving')
    setStatusError(null)
    try {
      const result = await fn()
      pending.current -= 1
      if (pending.current === 0) setStatus((s) => (s === 'error' ? s : 'saved'))
      return result
    } catch (e) {
      pending.current -= 1
      setStatus('error')
      setStatusError(e.message)
      throw e
    }
  }, [])

  // ---- Page text ----

  const getText = useCallback(
    (key, fallback) => (content && key in content ? content[key] : fallback),
    [content],
  )

  // Saves several keys at once: saveTexts({ key1: 'a', key2: 'b' }).
  const saveTexts = useCallback(
    async (entries) => {
      const previous = Object.fromEntries(Object.keys(entries).map((k) => [k, content?.[k]]))
      setContent((c) => ({ ...c, ...entries }))
      try {
        await track(() => api.saveContent(entries))
      } catch (e) {
        // Roll back so the page shows what's actually stored, then let the caller know.
        setContent((c) => {
          const next = { ...c }
          for (const [k, v] of Object.entries(previous)) {
            if (v === undefined) delete next[k]
            else next[k] = v
          }
          return next
        })
        throw e
      }
    },
    [content, track],
  )

  const saveText = useCallback((key, value) => saveTexts({ [key]: value }), [saveTexts])

  // ---- Media library ----

  const getMedia = useCallback((id) => (id && media?.[id]) || null, [media])

  const addMedia = useCallback(
    async (row) => {
      const created = await track(() => api.createMedia(row))
      setMedia((m) => ({ ...m, [created.id]: created }))
      return created
    },
    [track],
  )

  const updateMedia = useCallback(
    async (id, patch) => {
      const updated = await track(() => api.updateMedia(id, patch))
      setMedia((m) => ({ ...m, [id]: updated }))
      return updated
    },
    [track],
  )

  const removeMedia = useCallback(
    async (id) => {
      await track(() => api.deleteMedia(id))
      setMedia((m) => {
        const next = { ...m }
        delete next[id]
        return next
      })
    },
    [track],
  )

  const value = useMemo(
    () => ({
      editing,
      setEditing,
      content,
      getText,
      saveText,
      saveTexts,
      media,
      getMedia,
      addMedia,
      updateMedia,
      removeMedia,
      track,
      status,
      statusError,
    }),
    [
      editing,
      content,
      getText,
      saveText,
      saveTexts,
      media,
      getMedia,
      addMedia,
      updateMedia,
      removeMedia,
      track,
      status,
      statusError,
    ],
  )

  // Wait for saved content before rendering so visitors never see defaults flash first.
  if (content === null || media === null) return null

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}
