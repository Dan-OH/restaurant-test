import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SiteContext } from './site'
import { useAuth } from './useAuth'
import * as api from './api'
import { contentPrefix, FALLBACK_PAGES } from './pages'
import { FALLBACK_VARIABLES } from './variables'
import { arrangeWithoutGroup, navStructure } from './nav'

export function SiteProvider({ children }) {
  const { session } = useAuth()
  const [editingFlag, setEditing] = useState(false)
  const [content, setContent] = useState(null)
  const [media, setMedia] = useState(null) // { [id]: row }
  const [pages, setPages] = useState(null) // array, ordered by nav_order
  const [pageSections, setPageSections] = useState(null) // array, all pages' sections
  const [navGroups, setNavGroups] = useState(null) // array of navigation groups
  const [variableList, setVariableList] = useState(null) // array of site variables
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
      .fetchVariables()
      .then(setVariableList)
      .catch((e) => {
        console.error('Could not load variables, using defaults:', e.message)
        setVariableList(FALLBACK_VARIABLES)
      })
    api
      .fetchMedia()
      .then((rows) => setMedia(Object.fromEntries(rows.map((m) => [m.id, m]))))
      .catch((e) => {
        console.error('Could not load media library:', e.message)
        setMedia({})
      })
  }, [])

  // Refetch pages and their sections when the user logs in or out:
  // drafts are only visible to logged-in users.
  const userId = session?.user?.id
  useEffect(() => {
    api
      .fetchPages()
      .then(setPages)
      .catch((e) => {
        console.error('Could not load pages, using defaults:', e.message)
        setPages(FALLBACK_PAGES)
      })
    api
      .fetchNavGroups()
      .then(setNavGroups)
      .catch((e) => {
        console.error('Could not load navigation groups:', e.message)
        setNavGroups([])
      })
    api
      .fetchPageSections()
      .then(setPageSections)
      .catch((e) => {
        console.error('Could not load page sections:', e.message)
        setPageSections([])
      })
  }, [userId])

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

  // ---- Pages ----

  const addPage = useCallback(
    async (row) => {
      const created = await track(() => api.createPage(row))
      setPages((list) => [...list, created])
      return created
    },
    [track],
  )

  const updatePage = useCallback(
    async (id, patch) => {
      const updated = await track(() => api.updatePage(id, patch))
      setPages((list) => list.map((p) => (p.id === id ? updated : p)))
      return updated
    },
    [track],
  )

  const removePage = useCallback(
    async (page) => {
      const prefix = contentPrefix(page)
      await track(() => api.deletePage(page, prefix))
      // The database also deletes the page's sections and their content.
      const sectionPrefixes = (pageSections ?? []).filter((s) => s.page_id === page.id).map((s) => `section-${s.id}.`)
      setPages((list) => list.filter((p) => p.id !== page.id))
      setPageSections((list) => list.filter((s) => s.page_id !== page.id))
      setContent((c) =>
        Object.fromEntries(
          Object.entries(c).filter(([k]) => !k.startsWith(`${prefix}.`) && !sectionPrefixes.some((sp) => k.startsWith(sp))),
        ),
      )
    },
    [track, pageSections],
  )

  // ---- Navigation groups and arrangement ----

  // Applies an arrangement ([{ type, id, parent, position }], see lib/nav.js) to local state.
  const applyArrangement = useCallback((items) => {
    const pagesById = new Map(items.filter((i) => i.type === 'page').map((i) => [i.id, i]))
    const groupsById = new Map(items.filter((i) => i.type === 'group').map((i) => [i.id, i]))
    setPages((list) =>
      list.map((p) => {
        const i = pagesById.get(p.id)
        return i ? { ...p, group_id: i.parent, nav_order: i.position } : p
      }),
    )
    setNavGroups((list) =>
      list.map((g) => {
        const i = groupsById.get(g.id)
        return i ? { ...g, parent_id: i.parent, nav_order: i.position } : g
      }),
    )
  }, [])

  const reloadNav = useCallback(() => {
    api.fetchPages().then(setPages).catch(() => {})
    api.fetchNavGroups().then(setNavGroups).catch(() => {})
  }, [])

  // Saves where every page and group sits. Optimistic; on failure reloads and rethrows.
  const arrangeNav = useCallback(
    async (items) => {
      applyArrangement(items)
      try {
        await track(() => api.arrangeNav(items))
      } catch (e) {
        reloadNav()
        throw e
      }
    },
    [applyArrangement, reloadNav, track],
  )

  const addNavGroup = useCallback(
    async (row) => {
      const created = await track(() => api.createNavGroup(row))
      setNavGroups((list) => [...list, created])
      return created
    },
    [track],
  )

  const updateNavGroup = useCallback(
    async (id, patch) => {
      const updated = await track(() => api.updateNavGroup(id, patch))
      setNavGroups((list) => list.map((g) => (g.id === id ? updated : g)))
      return updated
    },
    [track],
  )

  // Deletes a group; its pages and sub-groups take its place in its parent.
  const removeNavGroup = useCallback(
    async (group) => {
      const items = arrangeWithoutGroup(navStructure(pages, navGroups), group.id)
      await arrangeNav(items)
      await track(() => api.deleteNavGroup(group.id))
      setNavGroups((list) => list.filter((g) => g.id !== group.id))
    },
    [pages, navGroups, arrangeNav, track],
  )

  // ---- Site variables ----

  // { key: variable } for looking up {{key}} tokens.
  const variables = useMemo(
    () => Object.fromEntries((variableList ?? []).map((v) => [v.key, v])),
    [variableList],
  )

  const addVariable = useCallback(
    async (row) => {
      const created = await track(() => api.createVariable(row))
      setVariableList((list) => [...list, created])
      return created
    },
    [track],
  )

  const updateVariable = useCallback(
    async (id, patch) => {
      const updated = await track(() => api.updateVariable(id, patch))
      setVariableList((list) => list.map((v) => (v.id === id ? updated : v)))
      return updated
    },
    [track],
  )

  const removeVariable = useCallback(
    async (id) => {
      await track(() => api.deleteVariable(id))
      setVariableList((list) => list.filter((v) => v.id !== id))
    },
    [track],
  )

  // ---- Page sections ----

  // Save a page's section order and mirror it locally.
  const saveSectionOrder = useCallback(
    async (ordered) => {
      const positions = new Map(ordered.map((s, i) => [s.id, i]))
      setPageSections((list) => list.map((s) => (positions.has(s.id) ? { ...s, position: positions.get(s.id) } : s)))
      await track(() => api.reorderPageSections(ordered.map((s) => s.id)))
    },
    [track],
  )

  const sectionsFor = useCallback(
    (pageId) => (pageSections ?? []).filter((s) => s.page_id === pageId).sort((a, b) => a.position - b.position),
    [pageSections],
  )

  /** Adds a section of `type` to a page at `index` (0 = top). Returns the new section. */
  const addPageSection = useCallback(
    async (pageId, type, index) => {
      const created = await track(() => api.createPageSection({ page_id: pageId, type, position: index }))
      const ordered = sectionsFor(pageId)
      ordered.splice(index, 0, created)
      setPageSections((list) => [...list, created])
      await saveSectionOrder(ordered)
      return created
    },
    [track, sectionsFor, saveSectionOrder],
  )

  // Optimistic, so settings changes (e.g. image left/right) show instantly.
  const updatePageSection = useCallback(
    async (id, patch) => {
      const previous = pageSections.find((s) => s.id === id)
      setPageSections((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)))
      try {
        const updated = await track(() => api.updatePageSection(id, patch))
        setPageSections((list) => list.map((s) => (s.id === id ? updated : s)))
      } catch (e) {
        setPageSections((list) => list.map((s) => (s.id === id ? previous : s)))
        throw e
      }
    },
    [pageSections, track],
  )

  const removePageSection = useCallback(
    async (section) => {
      await track(() => api.deletePageSection(section.id))
      const prefix = `section-${section.id}.`
      setPageSections((list) => list.filter((s) => s.id !== section.id))
      setContent((c) => Object.fromEntries(Object.entries(c).filter(([k]) => !k.startsWith(prefix))))
    },
    [track],
  )

  /** Moves a section up (-1) or down (+1) within its page. */
  const movePageSection = useCallback(
    async (section, delta) => {
      const ordered = sectionsFor(section.page_id)
      const from = ordered.findIndex((s) => s.id === section.id)
      const to = from + delta
      if (from === -1 || to < 0 || to >= ordered.length) return
      ordered.splice(to, 0, ordered.splice(from, 1)[0])
      try {
        await saveSectionOrder(ordered)
      } catch (e) {
        api.fetchPageSections().then(setPageSections).catch(() => {})
        throw e
      }
    },
    [sectionsFor, saveSectionOrder],
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
      pages,
      addPage,
      updatePage,
      removePage,
      navGroups,
      arrangeNav,
      addNavGroup,
      updateNavGroup,
      removeNavGroup,
      pageSections,
      sectionsFor,
      addPageSection,
      updatePageSection,
      removePageSection,
      movePageSection,
      variableList,
      variables,
      addVariable,
      updateVariable,
      removeVariable,
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
      pages,
      addPage,
      updatePage,
      removePage,
      navGroups,
      arrangeNav,
      addNavGroup,
      updateNavGroup,
      removeNavGroup,
      pageSections,
      sectionsFor,
      addPageSection,
      updatePageSection,
      removePageSection,
      movePageSection,
      variableList,
      variables,
      addVariable,
      updateVariable,
      removeVariable,
      track,
      status,
      statusError,
    ],
  )

  // Wait for saved content before rendering so visitors never see defaults flash first.
  if ([content, media, pages, pageSections, variableList, navGroups].includes(null)) return null

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}
