import { useRef, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useDraggable, useSensor, useSensors } from '@dnd-kit/core'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight'
import { arrangeAfterMove, findNode, flattenNav, subtreeKeys } from '../../lib/nav'

const GAP = 10 // space between rows, px
const INDENT = 40 // indentation per level, px

/**
 * Drag-and-drop tree of pages and navigation groups for the Pages dashboard.
 *
 * While dragging, nothing moves: a line shows where the item will go, and it's only moved when
 * released. Lines can be at any level, including inside groups. Each group also shows a
 * "Move into…" drop zone (handy for empty groups); dropping there puts the item at the end of
 * that group. Groups move with everything inside them and can't be dropped into themselves.
 * Keyboard: focus a drag handle and use the up/down arrow keys to move an item within its group.
 *
 * renderRow(node, { depth, handle, dropZone, dimmed }) renders a row for a page or group node
 * (see lib/nav.js); place `handle` and `dropZone` inside it. onArrange(items) receives the new
 * arrangement for arrangeNav.
 */
export default function NavTree({ tree, renderRow, onArrange }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const listRef = useRef(null)
  const rowEls = useRef(new Map()) // node key → row element
  const zoneEls = useRef(new Map()) // group node key → "Move into" zone element
  const [activeKey, setActiveKey] = useState(null)
  const [target, setTarget] = useState(null) // { type: 'gap', containerId, index, depth, top } | { type: 'into', groupId }

  const rows = flattenNav(tree)
  const active = activeKey ? findNode(tree, activeKey) : null
  // The dragged item and everything inside it can't be drop targets.
  const excluded = active ? subtreeKeys(active) : new Set()

  // Every place the dragged item could go, as lines between rows: in each container (the top
  // level and every group that isn't being dragged), before each item and after the last.
  function gaps() {
    const rect = (key) => rowEls.current.get(key)?.getBoundingClientRect()
    const result = []
    const visit = (nodes, containerId, depth, containerKey) => {
      const items = nodes.filter((n) => !excluded.has(n.key))
      items.forEach((n, index) => {
        const r = rect(n.key)
        if (r) result.push({ y: r.top - GAP / 2, containerId, index, depth })
      })
      // After the last item (below its whole block), or under the group row if it's empty.
      const lastKey = items.length ? lastRowKey(items[items.length - 1]) : containerKey
      const r = lastKey && rect(lastKey)
      if (r) result.push({ y: r.bottom + GAP / 2, containerId, index: items.length, depth })
      items.forEach((n) => n.children && visit(n.children, n.item.id, depth + 1, n.key))
    }
    visit(tree, null, 0, null)
    return result
  }

  // The last visible row inside a node's block (itself, or its last descendant).
  function lastRowKey(node) {
    const inside = (node.children ?? []).filter((c) => !excluded.has(c.key))
    return inside.length ? lastRowKey(inside[inside.length - 1]) : node.key
  }

  function handleDragMove(event) {
    if (!activeKey) return
    const x = event.activatorEvent.clientX + event.delta.x
    const y = event.activatorEvent.clientY + event.delta.y

    // Over a group's "Move into" zone?
    for (const [key, el] of zoneEls.current) {
      const r = el?.getBoundingClientRect()
      if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        const groupId = key.slice('group:'.length)
        setTarget((t) => (t?.type === 'into' && t.groupId === groupId ? t : { type: 'into', groupId }))
        return
      }
    }

    // Otherwise the nearest line. Lines at about the same height (e.g. the end of a group and the
    // next item after it) are told apart by how far right the pointer is.
    const candidates = gaps()
    if (!candidates.length) return setTarget(null)
    const listRect = listRef.current.getBoundingClientRect()
    const pointerDepth = Math.max(0, Math.round((x - listRect.left - INDENT / 2) / INDENT))
    const best = candidates.reduce((a, b) => {
      const da = Math.abs(a.y - y)
      const db = Math.abs(b.y - y)
      if (Math.abs(da - db) < 8) {
        return Math.abs(b.depth - pointerDepth) < Math.abs(a.depth - pointerDepth) ? b : a
      }
      return db < da ? b : a
    })
    const top = best.y - listRect.top
    setTarget((t) =>
      t?.type === 'gap' && t.containerId === best.containerId && t.index === best.index && t.top === top
        ? t
        : { type: 'gap', containerId: best.containerId, index: best.index, depth: best.depth, top },
    )
  }

  function handleDragEnd() {
    const key = activeKey
    const t = target
    setActiveKey(null)
    setTarget(null)
    if (!key || !t) return
    let items
    if (t.type === 'into') {
      const group = findNode(tree, `group:${t.groupId}`)
      const count = group.children.filter((c) => c.key !== key).length
      items = arrangeAfterMove(tree, key, t.groupId, count)
    } else {
      items = arrangeAfterMove(tree, key, t.containerId, t.index)
    }
    if (items) onArrange(items)
  }

  // Keyboard alternative: arrow keys on a handle move the item within its group.
  function handleKey(e, row) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const siblings = rows.filter((r) => r.containerId === row.containerId && r.depth === row.depth)
    const index = siblings.findIndex((r) => r.node.key === row.node.key)
    const next = index + (e.key === 'ArrowUp' ? -1 : 1)
    if (next < 0 || next >= siblings.length) return
    const items = arrangeAfterMove(tree, row.node.key, row.containerId, next)
    if (items) onArrange(items)
  }

  const containerTitle = (groupId) => findNode(tree, `group:${groupId}`)?.item.title

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveKey(e.active.id)}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveKey(null)
        setTarget(null)
      }}
    >
      <Box ref={listRef} sx={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: `${GAP}px` }}>
        {rows.map((row) => {
          const { node, depth } = row
          const canDropInto =
            active && node.type === 'group' && !excluded.has(node.key) && !isDirectlyIn(active, node, rows)
          return (
            <Box
              key={node.key}
              ref={(el) => (el ? rowEls.current.set(node.key, el) : rowEls.current.delete(node.key))}
              sx={{ ml: `${depth * INDENT}px`, position: 'relative' }}
            >
              {depth > 0 && (
                <SubdirectoryArrowRightIcon
                  fontSize="small"
                  sx={{ position: 'absolute', left: -INDENT + 10, top: 18, color: 'text.disabled' }}
                />
              )}
              {renderRow(node, {
                depth,
                dimmed: excluded.has(node.key),
                handle: (
                  <DragHandle
                    id={node.key}
                    label={`Move ${node.item.title} (drag, or use the arrow keys)`}
                    onKeyDown={(e) => handleKey(e, row)}
                  />
                ),
                dropZone: canDropInto ? (
                  <DropZone
                    title={node.item.title}
                    over={target?.type === 'into' && target.groupId === node.item.id}
                    zoneRef={(el) => (el ? zoneEls.current.set(node.key, el) : zoneEls.current.delete(node.key))}
                  />
                ) : null,
              })}
            </Box>
          )
        })}

        {/* Where the item will land when released. */}
        {active && target?.type === 'gap' && (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              top: target.top - 1.5,
              left: target.depth * INDENT,
              right: 0,
              height: 3,
              borderRadius: 2,
              bgcolor: 'primary.main',
              pointerEvents: 'none',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: -5,
                top: -4,
                width: 11,
                height: 11,
                borderRadius: '50%',
                bgcolor: 'primary.main',
              },
            }}
          />
        )}
      </Box>

      <DragOverlay dropAnimation={null}>
        {active && (
          <Card elevation={8} sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1, cursor: 'grabbing' }}>
            {active.type === 'group' ? (
              <FolderOutlinedIcon fontSize="small" color="primary" />
            ) : (
              <DragIndicatorIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            )}
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {active.item.title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', ml: 1 }}>
              {target?.type === 'into'
                ? `→ into ${containerTitle(target.groupId)}`
                : target?.containerId
                  ? `→ in ${containerTitle(target.containerId)}`
                  : '→ top level'}
            </Typography>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  )
}

// Whether `node` is directly inside `group` already (so "Move into" would do nothing).
function isDirectlyIn(node, group, rows) {
  return rows.some((r) => r.node.key === node.key && r.containerId === group.item.id)
}

function DragHandle({ id, label, onKeyDown }) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef } = useDraggable({ id })
  return (
    <IconButton
      ref={(el) => {
        setNodeRef(el)
        setActivatorNodeRef(el)
      }}
      size="small"
      aria-label={label}
      title={label}
      {...attributes}
      {...listeners}
      onKeyDown={onKeyDown}
      sx={{ cursor: 'grab', touchAction: 'none', '&:active': { cursor: 'grabbing' } }}
    >
      <DragIndicatorIcon fontSize="small" />
    </IconButton>
  )
}

function DropZone({ title, over, zoneRef }) {
  return (
    <Stack
      ref={zoneRef}
      direction="row"
      spacing={0.75}
      sx={{
        alignItems: 'center',
        alignSelf: 'stretch',
        flexShrink: 0,
        px: 1.5,
        borderRadius: 1,
        border: 2,
        borderStyle: 'dashed',
        borderColor: over ? 'primary.main' : 'divider',
        bgcolor: over ? 'primary.main' : 'action.hover',
        color: over ? 'primary.contrastText' : 'text.secondary',
        transition: 'all 0.12s',
      }}
    >
      <SubdirectoryArrowRightIcon fontSize="small" />
      <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
        Move into {title}
      </Typography>
    </Stack>
  )
}
