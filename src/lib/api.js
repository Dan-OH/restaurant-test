import { supabase } from './supabase'

function check({ data, error }) {
  if (error) throw error
  return data
}

// Returns sections ordered by position, each with an `items` array ordered by position.
export async function fetchMenu() {
  const data = check(
    await supabase
      .from('menu_sections')
      .select('id, name, description, position, items:menu_items(id, section_id, name, description, price, position)')
      .order('position')
      .order('position', { referencedTable: 'menu_items' }),
  )
  return data.map((s) => ({ ...s, items: s.items ?? [] }))
}

export async function createSection({ name, description }, position) {
  return check(
    await supabase
      .from('menu_sections')
      .insert({ name, description: description || null, position })
      .select()
      .single(),
  )
}

export async function updateSection(id, { name, description }) {
  return check(
    await supabase
      .from('menu_sections')
      .update({ name, description: description || null })
      .eq('id', id)
      .select()
      .single(),
  )
}

export async function deleteSection(id) {
  check(await supabase.from('menu_sections').delete().eq('id', id))
}

export async function reorderSections(ids) {
  check(await supabase.rpc('reorder_sections', { ids }))
}

export async function createItem(sectionId, { name, description, price }, position) {
  return check(
    await supabase
      .from('menu_items')
      .insert({
        section_id: sectionId,
        name,
        description: description || null,
        price: price === '' || price == null ? null : Number(price),
        position,
      })
      .select()
      .single(),
  )
}

export async function updateItem(id, { name, description, price }) {
  return check(
    await supabase
      .from('menu_items')
      .update({
        name,
        description: description || null,
        price: price === '' || price == null ? null : Number(price),
      })
      .eq('id', id)
      .select()
      .single(),
  )
}

export async function deleteItem(id) {
  check(await supabase.from('menu_items').delete().eq('id', id))
}

export async function reorderItems(ids) {
  check(await supabase.rpc('reorder_items', { ids }))
}

export function formatPrice(price) {
  if (price == null || price === '') return ''
  return `$${Number(price).toFixed(2)}`
}

// ---- Editable page text ----

export async function fetchContent() {
  const rows = check(await supabase.from('site_content').select('key, value'))
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export async function saveContent(key, value) {
  check(
    await supabase
      .from('site_content')
      .upsert({ key, value, updated_at: new Date().toISOString() }),
  )
}
