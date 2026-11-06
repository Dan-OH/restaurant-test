/**
 * Site navigation structure: pages and navigation groups (nav_groups) in one tree.
 *
 * Groups are named containers shown as dropdowns in the header (e.g. "About Us" holding Contact
 * and Team). They can hold pages and other groups, to any depth. Pages never contain anything.
 * Within each container, pages and groups share one ordering (nav_order).
 *
 * A node is { type: 'page' | 'group', item, key, children? } where `item` is the page or group
 * row, `key` is unique across both kinds, and only groups have `children`.
 */

export const nodeKey = (type, id) => `${type}:${id}`

const order = (a, b) => a.item.nav_order - b.item.nav_order || (a.type === b.type ? 0 : a.type === 'group' ? -1 : 1)

/** All pages and groups as a tree (the dashboard view). */
export function navStructure(pages, groups) {
  const groupIds = new Set(groups.map((g) => g.id))
  const containerOfPage = (p) => (p.group_id && groupIds.has(p.group_id) ? p.group_id : null)
  const containerOfGroup = (g) => (g.parent_id && groupIds.has(g.parent_id) ? g.parent_id : null)

  const build = (containerId, ancestors) =>
    [
      ...groups
        .filter((g) => containerOfGroup(g) === containerId && !ancestors.has(g.id))
        .map((g) => ({ type: 'group', item: g, key: nodeKey('group', g.id) })),
      ...pages
        .filter((p) => containerOfPage(p) === containerId)
        .map((p) => ({ type: 'page', item: p, key: nodeKey('page', p.id) })),
    ]
      .sort(order)
      .map((n) => (n.type === 'group' ? { ...n, children: build(n.item.id, new Set([...ancestors, n.item.id])) } : n))

  return build(null, new Set())
}

/**
 * The header navigation: published pages with "show in navigation", in their groups.
 * Groups with nothing visible inside are left out.
 */
export function publicNav(pages, groups) {
  const visible = (p) => p.show_in_nav && p.published
  const prune = (nodes) =>
    nodes.flatMap((n) => {
      if (n.type === 'page') return visible(n.item) ? [n] : []
      const children = prune(n.children)
      return children.length ? [{ ...n, children }] : []
    })
  return prune(navStructure(pages, groups))
}

/** The tree as display rows: [{ node, depth, containerId }] in order. */
export function flattenNav(tree, depth = 0, containerId = null) {
  return tree.flatMap((node) => [
    { node, depth, containerId },
    ...(node.children ? flattenNav(node.children, depth + 1, node.item.id) : []),
  ])
}

/** Keys of a node and everything inside it. */
export function subtreeKeys(node) {
  return new Set([node.key, ...(node.children ?? []).flatMap((c) => [...subtreeKeys(c)])])
}

export function findNode(tree, key) {
  for (const n of tree) {
    if (n.key === key) return n
    const found = n.children && findNode(n.children, key)
    if (found) return found
  }
  return null
}

/** Every page and group as { type, id, parent, position } for saving (arrangeNav). */
export function serializeNav(tree) {
  const items = []
  const walk = (nodes, parent) =>
    nodes.forEach((n, position) => {
      items.push({ type: n.type, id: n.item.id, parent, position })
      if (n.children) walk(n.children, n.item.id)
    })
  walk(tree, null)
  return items
}

function cloneTree(tree) {
  return tree.map((n) => (n.children ? { ...n, children: cloneTree(n.children) } : { ...n }))
}

function childrenOf(tree, containerId) {
  if (!containerId) return tree
  return findNode(tree, nodeKey('group', containerId))?.children ?? null
}

/**
 * Arrangement after moving the node `key` into group `containerId` (null = top level) at
 * `index` among that container's items (counted without the moved node).
 * Moving a group into itself or its own sub-groups is ignored (returns null).
 */
export function arrangeAfterMove(tree, key, containerId, index) {
  const moving = findNode(tree, key)
  if (!moving) return null
  if (containerId && subtreeKeys(moving).has(nodeKey('group', containerId))) return null

  const next = cloneTree(tree)
  let moved = null
  const detach = (nodes) =>
    nodes.filter((n) => {
      if (n.key === key) {
        moved = n
        return false
      }
      if (n.children) n.children = detach(n.children)
      return true
    })
  const root = detach(next)
  const target = childrenOf(root, containerId)
  if (!target || !moved) return null
  target.splice(Math.max(0, Math.min(index, target.length)), 0, moved)
  return serializeNav(root)
}

/** Arrangement after deleting a group: its contents take its place in its parent. */
export function arrangeWithoutGroup(tree, groupId) {
  const key = nodeKey('group', groupId)
  const dissolve = (nodes) => nodes.flatMap((n) => (n.key === key ? n.children : [n.children ? { ...n, children: dissolve(n.children) } : n]))
  return serializeNav(dissolve(cloneTree(tree)))
}

/** Groups as "About Us › Team" paths, for pickers. Excludes `excludeKeys` (e.g. a group and its subtree). */
export function groupOptions(tree, excludeKeys = new Set(), trail = []) {
  return tree.flatMap((n) => {
    if (n.type !== 'group' || excludeKeys.has(n.key)) return []
    const path = [...trail, n.item.title]
    return [{ id: n.item.id, label: path.join(' › ') }, ...groupOptions(n.children, excludeKeys, path)]
  })
}
