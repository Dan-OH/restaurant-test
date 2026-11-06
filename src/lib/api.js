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

/** Saves one or more keys in a single request: saveContent({ 'home.hero.title': 'Hi' }) */
export async function saveContent(entries) {
  const updated_at = new Date().toISOString()
  const rows = Object.entries(entries).map(([key, value]) => ({ key, value, updated_at }))
  check(await supabase.from('site_content').upsert(rows))
}

// ---- Images (Supabase Storage) ----

const IMAGE_BUCKET = 'site-images'

/** Uploads a file under `folder/` with a unique name and returns its storage path. */
export async function uploadImage(file, folder) {
  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'img'
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  check(
    await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: '31536000' }),
  )
  return path
}

export async function deleteImage(path) {
  check(await supabase.storage.from(IMAGE_BUCKET).remove([path]))
}

export function imageUrl(path) {
  if (!path) return null
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
}

// ---- Media library ----

export async function fetchMedia() {
  return check(await supabase.from('media').select('*').order('created_at', { ascending: false }))
}

export async function createMedia(row) {
  return check(await supabase.from('media').insert(row).select().single())
}

export async function updateMedia(id, patch) {
  return check(
    await supabase
      .from('media')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single(),
  )
}

export async function deleteMedia(id) {
  check(await supabase.from('media').delete().eq('id', id))
}

// ---- Pages ----

export async function fetchPages() {
  return check(await supabase.from('pages').select('*').order('nav_order'))
}

export async function createPage(row) {
  return check(await supabase.from('pages').insert(row).select().single())
}

export async function updatePage(id, patch) {
  return check(await supabase.from('pages').update(patch).eq('id', id).select().single())
}

/** Deletes a page and all of its text/image placements (images stay in the library). */
export async function deletePage(page, contentPrefix) {
  check(await supabase.from('site_content').delete().like('key', `${contentPrefix}.%`))
  check(await supabase.from('pages').delete().eq('id', page.id))
}

// ---- Navigation groups ----

export async function fetchNavGroups() {
  return check(await supabase.from('nav_groups').select('*').order('nav_order'))
}

export async function createNavGroup(row) {
  return check(await supabase.from('nav_groups').insert(row).select().single())
}

export async function updateNavGroup(id, patch) {
  return check(await supabase.from('nav_groups').update(patch).eq('id', id).select().single())
}

export async function deleteNavGroup(id) {
  check(await supabase.from('nav_groups').delete().eq('id', id))
}

/** Saves the navigation arrangement: items = [{ type: 'page' | 'group', id, parent, position }]. */
export async function arrangeNav(items) {
  check(await supabase.rpc('arrange_nav', { items }))
}

// ---- Page sections ----

export async function fetchPageSections() {
  return check(await supabase.from('page_sections').select('*').order('position'))
}

export async function createPageSection(row) {
  return check(await supabase.from('page_sections').insert(row).select().single())
}

export async function updatePageSection(id, patch) {
  return check(
    await supabase
      .from('page_sections')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single(),
  )
}

/** Deleting a section also deletes its text/image placements (database trigger). */
export async function deletePageSection(id) {
  check(await supabase.from('page_sections').delete().eq('id', id))
}

export async function reorderPageSections(ids) {
  check(await supabase.rpc('reorder_page_sections', { ids }))
}

// ---- Site variables ----

export async function fetchVariables() {
  return check(await supabase.from('site_variables').select('*').order('label'))
}

export async function createVariable(row) {
  return check(await supabase.from('site_variables').insert(row).select().single())
}

export async function updateVariable(id, patch) {
  return check(
    await supabase
      .from('site_variables')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single(),
  )
}

export async function deleteVariable(id) {
  check(await supabase.from('site_variables').delete().eq('id', id))
}

// ---- Image sources (shared originals, deduplicated by hash) ----

export async function findMediaSource(hash) {
  return check(await supabase.from('media_sources').select('*').eq('hash', hash).maybeSingle())
}

export async function createMediaSource(row) {
  return check(await supabase.from('media_sources').insert(row).select().single())
}

export async function deleteMediaSource(id) {
  check(await supabase.from('media_sources').delete().eq('id', id))
}
