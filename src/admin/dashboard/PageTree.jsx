import { useRef, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useDraggable, useSensor, useSensors } from '@dnd-kit/core'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight'
import { arrangeAfterMove, canNest, pageTree } from '../../lib/pages'

const GAP = 10 // space between rows, px
const INDENT = 44 // indentation of child pages, px

/**
 * Drag-and-drop page tree for the Pages dashboard.
 *
 * While dragging, nothing moves: a line shows where the page will go, and it's only reordered
 * when released. Eligible pages show a "Nest under…" drop zone; dropping there makes the page
 * a child page. Dropping anywhere else reorders (a child page can move among its siblings or
 * out to the top level; a top-level page stays top-level).
 * Keyboard: focus a drag handle and use the up/down arrow keys to move a page among its siblings.
 *
 * renderRow(page, { depth, handle, nestZone, dimmed }) renders a row; place `handle` and
 * `nestZone` inside it. onArrange(items) receives the new arrangement (see arrangeAfterMove).
 */
export default function PageTree({ pages, renderRow, onArrange }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const listRef = useRef(null)
  const rowEls = useRef(new Map()) // page id → row element
  const nestEls = useRef(new Map()) // page id → nest drop zone element
  const [activeId, setActiveId] = useState(null)
  const [target, setTarget] = useState(null) // { type: 'gap', y, depth, parentId, index } | { type: 'nest', parentId }

  const tree = pageTree(pages)
  const rows = tree.flatMap(({ page, children }) => [
    { page, depth: 0, parentId: null },
    ...children.map((child) => ({ page: child, depth: 1, parentId: page.id })),
  ])
  const active = pages.find((p) => p.id === activeId)

  // Where the dragged page could be dropped to reorder it, as lines between rows.
  function gapsFor(dragged) {
    const rect = (id) => rowEls.current.get(id)?.getBoundingClientRect()
    const gaps = []
    const tops = tree.map((n) => n.page).filter((p) => p.id !== dragged.id)
    // Top level: before each top-level page's block, and after the last block.
    tree.forEach((node) => {
      if (node.page.id === dragged.id) return
      const r = rect(node.page.id)
      if (r) gaps.push({ y: r.top - GAP / 2, depth: 0, parentId: null, index: tops.indexOf(node.page) })
    })
    const lastRow = rows[rows.length - 1]
    const last = lastRow && rect(lastRow.page.id)
    if (last) gaps.push({ y: last.bottom + GAP / 2, depth: 0, parentId: null, index: tops.length })

    // A child page can also move among its siblings.
    if (dragged.parent_id) {
      const node = tree.find((n) => n.page.id === dragged.parent_id)
      const siblings = node?.children.filter((c) => c.id !== dragged.id) ?? []
      siblings.forEach((child, index) => {
        const r = rect(child.id)
        if (r) gaps.push({ y: r.top - GAP / 2, depth: 1, parentId: dragged.parent_id, index })
      })
      const lastSibling = siblings.length ? rect(siblings[siblings.length - 1].id) : rect(dragged.parent_id)
      if (lastSibling) {
        gaps.push({ y: lastSibling.bottom + GAP / 2, depth: 1, parentId: dragged.parent_id, index: siblings.length })
      }
    }
    return gaps
  }

  function nestTargetsFor(dragged) {
    return tree.map((n) => n.page).filter((p) => p.id !== dragged.parent_id && canNest(dragged, p, pages))
  }

  function handleDragMove(event) {
    const dragged = active ?? pages.find((p) => p.id === event.active.id)
    if (!dragged) return
    const x = event.activatorEvent.clientX + event.delta.x
    const y = event.activatorEvent.clientY + event.delta.y

    // Over a "Nest under…" zone?
    for (const [id, el] of nestEls.current) {
      const r = el?.getBoundingClientRect()
      if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        setTarget((t) => (t?.type === 'nest' && t.parentId === id ? t : { type: 'nest', parentId: id }))
        return
      }
    }

    // Otherwise the nearest line; when two are about equally close, the pointer's indent picks.
    const gaps = gapsFor(dragged)
    if (!gaps.length) return setTarget(null)
    const listRect = listRef.current.getBoundingClientRect()
    const listLeft = listRect.left
    const wantDepth = x - listLeft > INDENT * 1.5 ? 1 : 0
    const best = gaps.reduce((a, b) => {
      const da = Math.abs(a.y - y)
      const db = Math.abs(b.y - y)
      if (Math.abs(da - db) < 8) return (b.depth === wantDepth) > (a.depth === wantDepth) ? b : a
      return db < da ? b : a
    })
    // The line's position within the list (the list can scroll, so recompute each move).
    const top = best.y - listRect.top
    setTarget((t) =>
      t?.type === 'gap' && t.parentId === best.parentId && t.index === best.index && t.top === top
        ? t
        : { type: 'gap', ...best, top },
    )
  }

  function handleDragEnd() {
    const dragged = active
    const t = target
    setActiveId(null)
    setTarget(null)
    if (!dragged || !t) return
    if (t.type === 'nest') {
      const childCount = pages.filter((p) => p.parent_id === t.parentId).length
      onArrange(arrangeAfterMove(pages, dragged.id, t.parentId, childCount))
    } else {
      onArrange(arrangeAfterMove(pages, dragged.id, t.parentId, t.index))
    }
  }

  // Keyboard alternative: arrow keys on a handle move the page among its siblings.
  function handleKey(e, row) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const siblings = rows.filter((r) => r.parentId === row.parentId).map((r) => r.page)
    const index = siblings.findIndex((p) => p.id === row.page.id)
    const next = index + (e.key === 'ArrowUp' ? -1 : 1)
    if (next < 0 || next >= siblings.length) return
    onArrange(arrangeAfterMove(pages, row.page.id, row.parentId, next))
  }

  const nestTargets = active ? nestTargetsFor(active) : []

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(e.active.id)}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null)
        setTarget(null)
      }}
    >
      <Box ref={listRef} sx={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: `${GAP}px` }}>
        {rows.map((row) => {
          const nestable = nestTargets.some((p) => p.id === row.page.id)
          return (
            <Box
              key={row.page.id}
              ref={(el) => (el ? rowEls.current.set(row.page.id, el) : rowEls.current.delete(row.page.id))}
              sx={{ ml: row.depth ? `${INDENT}px` : 0, position: 'relative' }}
            >
              {row.depth > 0 && (
                <SubdirectoryArrowRightIcon
                  fontSize="small"
                  sx={{ position: 'absolute', left: -INDENT + 12, top: 18, color: 'text.disabled' }}
                />
              )}
              {renderRow(row.page, {
                depth: row.depth,
                dimmed: row.page.id === activeId,
                handle: (
                  <DragHandle
                    id={row.page.id}
                    label={`Reorder ${row.page.title} (drag, or use the arrow keys)`}
                    onKeyDown={(e) => handleKey(e, row)}
                  />
                ),
                nestZone: nestable ? (
                  <NestZone
                    title={row.page.title}
                    over={target?.type === 'nest' && target.parentId === row.page.id}
                    zoneRef={(el) => (el ? nestEls.current.set(row.page.id, el) : nestEls.current.delete(row.page.id))}
                  />
                ) : null,
              })}
            </Box>
          )
        })}

        {/* Where the page will land when released. */}
        {active && target?.type === 'gap' && (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              top: target.top - 1.5,
              left: target.depth ? INDENT : 0,
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
            <DragIndicatorIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {active.title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', ml: 1 }}>
              {target?.type === 'nest'
                ? `→ under ${pages.find((p) => p.id === target.parentId)?.title}`
                : target?.parentId
                  ? '→ child page'
                  : '→ top level'}
            </Typography>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  )
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

function NestZone({ title, over, zoneRef }) {
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
        Nest under {title}
      </Typography>
    </Stack>
  )
}
