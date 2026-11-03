import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/menuApi'
import { DragHandle, SortableList } from '../components/admin/SortableList.jsx'
import SectionForm from '../components/admin/SectionForm.jsx'
import ItemForm from '../components/admin/ItemForm.jsx'

export default function AdminMenu() {
  const [sections, setSections] = useState(null)
  const [error, setError] = useState(null)
  const [addingSection, setAddingSection] = useState(false)

  const load = useCallback(async () => {
    try {
      setSections(await api.fetchMenu())
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    api.fetchMenu().then(setSections).catch((e) => setError(e.message))
  }, [])

  // Run a mutation; on failure show the error and reload from the server so the UI isn't stale.
  async function run(fn) {
    setError(null)
    try {
      return await fn()
    } catch (e) {
      setError(e.message)
      await load()
      throw e
    }
  }

  const updateSectionState = (id, fn) =>
    setSections((prev) => prev.map((s) => (s.id === id ? fn(s) : s)))

  // ---- Sections ----
  async function addSection(values) {
    const created = await run(() => api.createSection(values, sections.length))
    setSections((prev) => [...prev, { ...created, items: [] }])
    setAddingSection(false)
  }

  async function saveSection(id, values) {
    const updated = await run(() => api.updateSection(id, values))
    updateSectionState(id, (s) => ({ ...s, ...updated }))
  }

  async function removeSection(section) {
    const count = section.items.length
    const msg = count
      ? `Delete "${section.name}" and its ${count} item${count === 1 ? '' : 's'}?`
      : `Delete "${section.name}"?`
    if (!window.confirm(msg)) return
    try {
      await run(() => api.deleteSection(section.id))
    } catch {
      return
    }
    setSections((prev) => prev.filter((s) => s.id !== section.id))
  }

  function reorderSections(next) {
    setSections(next)
    run(() => api.reorderSections(next.map((s) => s.id))).catch(() => {})
  }

  // ---- Items ----
  async function addItem(sectionId, values) {
    const section = sections.find((s) => s.id === sectionId)
    const created = await run(() => api.createItem(sectionId, values, section.items.length))
    updateSectionState(sectionId, (s) => ({ ...s, items: [...s.items, created] }))
  }

  async function saveItem(sectionId, itemId, values) {
    const updated = await run(() => api.updateItem(itemId, values))
    updateSectionState(sectionId, (s) => ({
      ...s,
      items: s.items.map((i) => (i.id === itemId ? updated : i)),
    }))
  }

  async function removeItem(sectionId, item) {
    if (!window.confirm(`Delete "${item.name}"?`)) return
    try {
      await run(() => api.deleteItem(item.id))
    } catch {
      return
    }
    updateSectionState(sectionId, (s) => ({ ...s, items: s.items.filter((i) => i.id !== item.id) }))
  }

  function reorderItems(sectionId, next) {
    updateSectionState(sectionId, (s) => ({ ...s, items: next }))
    run(() => api.reorderItems(next.map((i) => i.id))).catch(() => {})
  }

  if (!sections) {
    return <div className="container page">{error ? <p className="error">{error}</p> : 'Loading…'}</div>
  }

  return (
    <div className="container page admin">
      <div className="admin-header">
        <h1>Edit Menu</h1>
        <Link to="/menu" className="button secondary">
          View live menu
        </Link>
      </div>
      <p className="muted">Drag the ⠿ handles to reorder sections and items. Changes save automatically.</p>
      {error && <p className="error">{error}</p>}

      <SortableList
        className="admin-sections"
        items={sections}
        onReorder={reorderSections}
        renderItem={(section) => (
          <SectionCard
            section={section}
            onSave={(values) => saveSection(section.id, values)}
            onDelete={() => removeSection(section)}
            onAddItem={(values) => addItem(section.id, values)}
            onSaveItem={(itemId, values) => saveItem(section.id, itemId, values)}
            onDeleteItem={(item) => removeItem(section.id, item)}
            onReorderItems={(next) => reorderItems(section.id, next)}
          />
        )}
      />

      {addingSection ? (
        <div className="card">
          <h3>New section</h3>
          <SectionForm
            submitLabel="Add section"
            onSubmit={addSection}
            onCancel={() => setAddingSection(false)}
          />
        </div>
      ) : (
        <button className="button" onClick={() => setAddingSection(true)}>
          + Add section
        </button>
      )}
    </div>
  )
}

function SectionCard({ section, onSave, onDelete, onAddItem, onSaveItem, onDeleteItem, onReorderItems }) {
  const [editing, setEditing] = useState(false)
  const [addingItem, setAddingItem] = useState(false)

  return (
    <div className="card section-card">
      <div className="row-head">
        <DragHandle label={`Reorder section ${section.name}`} />
        {editing ? (
          <div className="grow">
            <SectionForm
              initial={section}
              onSubmit={async (values) => {
                await onSave(values)
                setEditing(false)
              }}
              onCancel={() => setEditing(false)}
            />
          </div>
        ) : (
          <>
            <div className="grow">
              <h2>{section.name}</h2>
              {section.description && <p className="muted">{section.description}</p>}
            </div>
            <div className="row-actions">
              <button className="button small secondary" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button className="button small danger" onClick={onDelete}>
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {section.items.length === 0 && <p className="muted empty">No items yet.</p>}

      <SortableList
        className="admin-items"
        items={section.items}
        onReorder={onReorderItems}
        renderItem={(item) => (
          <ItemRow
            item={item}
            onSave={(values) => onSaveItem(item.id, values)}
            onDelete={() => onDeleteItem(item)}
          />
        )}
      />

      {addingItem ? (
        <div className="item-row adding">
          <ItemForm
            submitLabel="Add item"
            onSubmit={async (values) => {
              await onAddItem(values)
              setAddingItem(false)
            }}
            onCancel={() => setAddingItem(false)}
          />
        </div>
      ) : (
        <button className="button small secondary add-item" onClick={() => setAddingItem(true)}>
          + Add item
        </button>
      )}
    </div>
  )
}

function ItemRow({ item, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)

  return (
    <div className="item-row row-head">
      <DragHandle label={`Reorder ${item.name}`} />
      {editing ? (
        <div className="grow">
          <ItemForm
            initial={item}
            onSubmit={async (values) => {
              await onSave(values)
              setEditing(false)
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          <div className="grow">
            <div className="item-title">
              <strong>{item.name}</strong>
              <span>{api.formatPrice(item.price)}</span>
            </div>
            {item.description && <p className="muted">{item.description}</p>}
          </div>
          <div className="row-actions">
            <button className="button small secondary" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button className="button small danger" onClick={onDelete}>
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}
