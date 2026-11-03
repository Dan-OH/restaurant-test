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

/**
 * A vertical drag-and-drop list. `onReorder` receives the new array of items.
 * `renderItem(item, handle)` renders a row; spread `handle` onto a drag-handle button.
 */
export function SortableList({ items, onReorder, renderItem, className }) {
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
        <ul className={className}>
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
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  }

  return (
    <li ref={setNodeRef} style={style} className={isDragging ? 'dragging' : undefined}>
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
    <button
      type="button"
      className="drag-handle"
      ref={setActivatorNodeRef}
      aria-label={label}
      title={label}
      {...attributes}
      {...listeners}
    >
      ⠿
    </button>
  )
}
