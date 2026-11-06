import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import * as api from '../../lib/api'
import { useSite } from '../../lib/site'
import AdminTheme from '../AdminTheme.jsx'
import { DragHandle, SortableList } from '../SortableList.jsx'
import SectionForm from './SectionForm.jsx'
import ItemForm from './ItemForm.jsx'
import { useConfirm } from '../confirm'

/**
 * Edit-mode view of the menu. `sections` state is owned by the Menu page so the
 * public view reflects edits immediately; `reload` refetches from the database.
 */
export default function MenuEditor(props) {
  return (
    <AdminTheme>
      <Editor {...props} />
    </AdminTheme>
  )
}

function Editor({ sections, setSections, reload }) {
  const { track } = useSite()
  const { confirm } = useConfirm()
  const [error, setError] = useState(null)
  const [addingSection, setAddingSection] = useState(false)

  // Run a mutation; on failure show the error and reload from the server so the UI isn't stale.
  async function run(fn) {
    setError(null)
    try {
      return await track(fn)
    } catch (e) {
      setError(e.message)
      await reload()
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
    const ok = await confirm({
      title: 'Delete section?',
      message: count
        ? `"${section.name}" and its ${count} menu item${count === 1 ? '' : 's'} will be permanently deleted.`
        : `"${section.name}" will be permanently deleted.`,
      confirmText: section.name,
      confirmLabel: 'Delete section',
      danger: true,
    })
    if (!ok) return
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
    const ok = await confirm({
      title: 'Delete menu item?',
      message: `"${item.name}" will be permanently deleted.`,
      confirmText: item.name,
      confirmLabel: 'Delete item',
      danger: true,
    })
    if (!ok) return
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

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <Alert severity="info" variant="outlined">
        Drag the handles to reorder sections and items. Changes save automatically.
      </Alert>
      {error && <Alert severity="error">{error}</Alert>}

      <SortableList
        items={sections}
        gap={16}
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
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" component="h3" gutterBottom>
              New section
            </Typography>
            <SectionForm submitLabel="Add section" onSubmit={addSection} onCancel={() => setAddingSection(false)} />
          </CardContent>
        </Card>
      ) : (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddingSection(true)}>
            Add section
          </Button>
        </Box>
      )}
    </Stack>
  )
}

function RowActions({ name, onEdit, onDelete }) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
      <Tooltip title="Edit">
        <IconButton size="small" aria-label={`Edit ${name}`} onClick={onEdit}>
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton size="small" color="error" aria-label={`Delete ${name}`} onClick={onDelete}>
          <DeleteOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}

function SectionCard({ section, onSave, onDelete, onAddItem, onSaveItem, onDeleteItem, onReorderItems }) {
  const [editing, setEditing] = useState(false)
  const [addingItem, setAddingItem] = useState(false)

  return (
    <Card variant="outlined">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', p: 2 }}>
        <DragHandle label={`Reorder section ${section.name}`} />
        {editing ? (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <SectionForm
              initial={section}
              onSubmit={async (values) => {
                await onSave(values)
                setEditing(false)
              }}
              onCancel={() => setEditing(false)}
            />
          </Box>
        ) : (
          <>
            <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
              <Typography variant="h6" component="h2">
                {section.name}
              </Typography>
              {section.description && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {section.description}
                </Typography>
              )}
            </Box>
            <RowActions name={section.name} onEdit={() => setEditing(true)} onDelete={onDelete} />
          </>
        )}
      </Stack>

      {section.items.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary', px: 2, pb: 1, pl: 7 }}>
          No items yet.
        </Typography>
      )}

      <SortableList
        items={section.items}
        onReorder={onReorderItems}
        renderItem={(item) => (
          <ItemRow item={item} onSave={(values) => onSaveItem(item.id, values)} onDelete={() => onDeleteItem(item)} />
        )}
      />

      <Box sx={{ px: 2, py: 1.5, pl: addingItem ? 7 : 6, borderTop: 1, borderColor: 'divider' }}>
        {addingItem ? (
          <ItemForm
            submitLabel="Add item"
            onSubmit={async (values) => {
              await onAddItem(values)
              setAddingItem(false)
            }}
            onCancel={() => setAddingItem(false)}
          />
        ) : (
          <Button size="small" startIcon={<AddIcon />} onClick={() => setAddingItem(true)}>
            Add item
          </Button>
        )}
      </Box>
    </Card>
  )
}

function ItemRow({ item, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: 'flex-start', px: 2, py: 1.25, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <DragHandle label={`Reorder ${item.name}`} />
      {editing ? (
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ItemForm
            initial={item}
            onSubmit={async (values) => {
              await onSave(values)
              setEditing(false)
            }}
            onCancel={() => setEditing(false)}
          />
        </Box>
      ) : (
        <>
          <Box sx={{ flex: 1, minWidth: 0, pt: 0.5 }}>
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
                {item.name}
              </Typography>
              <Typography variant="subtitle1" sx={{ lineHeight: 1.4 }}>
                {api.formatPrice(item.price)}
              </Typography>
            </Stack>
            {item.description && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {item.description}
              </Typography>
            )}
          </Box>
          <RowActions name={item.name} onEdit={() => setEditing(true)} onDelete={onDelete} />
        </>
      )}
    </Stack>
  )
}
