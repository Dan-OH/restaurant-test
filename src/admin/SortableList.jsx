import { createContext, useContext } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import IconButton from '@mui/material/IconButton'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'

/**
 * A vertical drag-and-drop list. `onReorder` receives the new array of items.
 * `renderItem(item)` renders a row; put a <DragHandle /> inside it.
 */
export function SortableList({ items, onReorder, renderItem, gap = 0 }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const from = items.findIndex((i) => i.id === active.id)
    const to = items.findIndex((i) => i.id === over.id)
    onReorder(arrayMove(items, from, to))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap }}>
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id}>
              {renderItem(item)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

const HandleContext = createContext(null)

function SortableRow({ id, children }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
    boxShadow: isDragging ? '0 8px 24px rgba(0, 0, 0, 0.15)' : undefined,
    borderRadius: 8,
  }

  return (
    <li ref={setNodeRef} style={style}>
      <HandleContext.Provider value={{ attributes, listeners, setActivatorNodeRef }}>
        {children}
      </HandleContext.Provider>
    </li>
  )
}

/** The grab handle for the nearest sortable row. */
export function DragHandle({ label = 'Drag to reorder' }) {
  const { attributes, listeners, setActivatorNodeRef } = useContext(HandleContext)
  return (
    <IconButton
      ref={setActivatorNodeRef}
      size="small"
      aria-label={label}
      title={label}
      {...attributes}
      {...listeners}
      sx={{ cursor: 'grab', touchAction: 'none', '&:active': { cursor: 'grabbing' } }}
    >
      <DragIndicatorIcon fontSize="small" />
    </IconButton>
  )
}
