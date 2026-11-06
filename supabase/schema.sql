-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create table if not exists public.menu_sections (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.menu_items (
  id          uuid primary key default gen_random_uuid(),
  section_id  uuid not null references public.menu_sections(id) on delete cascade,
  name        text not null,
  description text,
  price       numeric(10, 2),
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists menu_items_section_position_idx
  on public.menu_items (section_id, position);

-- Row Level Security: anyone can read the menu, only signed-in users can change it.
alter table public.menu_sections enable row level security;
alter table public.menu_items    enable row level security;

drop policy if exists "Public read sections" on public.menu_sections;
create policy "Public read sections" on public.menu_sections
  for select using (true);

drop policy if exists "Authenticated write sections" on public.menu_sections;
create policy "Authenticated write sections" on public.menu_sections
  for all to authenticated using (true) with check (true);

drop policy if exists "Public read items" on public.menu_items;
create policy "Public read items" on public.menu_items
  for select using (true);

drop policy if exists "Authenticated write items" on public.menu_items;
create policy "Authenticated write items" on public.menu_items
  for all to authenticated using (true) with check (true);

-- Reorder helpers: pass the ids in their new order; positions are set in one transaction.
create or replace function public.reorder_sections(ids uuid[])
returns void
language sql
security invoker
as $$
  update public.menu_sections s
     set position = o.ord - 1
    from unnest(ids) with ordinality as o(id, ord)
   where s.id = o.id;
$$;

create or replace function public.reorder_items(ids uuid[])
returns void
language sql
security invoker
as $$
  update public.menu_items i
     set position = o.ord - 1
    from unnest(ids) with ordinality as o(id, ord)
   where i.id = o.id;
$$;

revoke execute on function public.reorder_sections(uuid[]) from anon, public;
revoke execute on function public.reorder_items(uuid[])    from anon, public;
grant  execute on function public.reorder_sections(uuid[]) to authenticated;
grant  execute on function public.reorder_items(uuid[])    to authenticated;

-- ---------------------------------------------------------------------------
-- Editable page text. Each row overrides one piece of text on the site, keyed
-- by an id like 'home.hero.title'. Missing keys fall back to the defaults in code.
-- ---------------------------------------------------------------------------
create table if not exists public.site_content (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

drop policy if exists "Public read content" on public.site_content;
create policy "Public read content" on public.site_content
  for select using (true);

drop policy if exists "Authenticated write content" on public.site_content;
create policy "Authenticated write content" on public.site_content
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Image uploads (hero image etc). Public bucket: anyone can view files by URL,
-- only signed-in users can upload or delete.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated read site images" on storage.objects;
create policy "Authenticated read site images" on storage.objects
  for select to authenticated using (bucket_id = 'site-images');

drop policy if exists "Authenticated upload site images" on storage.objects;
create policy "Authenticated upload site images" on storage.objects
  for insert to authenticated with check (bucket_id = 'site-images');

drop policy if exists "Authenticated update site images" on storage.objects;
create policy "Authenticated update site images" on storage.objects
  for update to authenticated using (bucket_id = 'site-images');

drop policy if exists "Authenticated delete site images" on storage.objects;
create policy "Authenticated delete site images" on storage.objects
  for delete to authenticated using (bucket_id = 'site-images');

-- ---------------------------------------------------------------------------
-- Media library. One row per image. Placements on the site (site_content keys
-- like 'home.hero.image') store the media id, so editing an image here updates
-- it everywhere it's used.
--   path           the optimized/cropped file visitors see
--   original_path  the uncropped original, so crops can be redone without quality loss
--   settings       { aspect, area, width, format, quality } used to render `path`
-- ---------------------------------------------------------------------------
create table if not exists public.media (
  id              uuid primary key default gen_random_uuid(),
  name            text not null default '',
  path            text not null,
  original_path   text,
  settings        jsonb,
  alt             text not null default '',
  width           integer,
  height          integer,
  size            integer,
  mime_type       text,
  original_width  integer,
  original_height integer,
  original_size   integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.media enable row level security;

drop policy if exists "Public read media" on public.media;
create policy "Public read media" on public.media
  for select using (true);

drop policy if exists "Authenticated write media" on public.media;
create policy "Authenticated write media" on public.media
  for all to authenticated using (true) with check (true);

-- One-time migration: images saved before the media library stored a storage path
-- (plus .original / .crop / .alt keys) directly in site_content. Move each into a
-- media row and point the placement at it. Safe to re-run: migrated keys hold ids.
do $$
declare
  r record;
  new_id uuid;
begin
  for r in
    select c.key,
           c.value as path,
           nullif((select value from public.site_content where key = c.key || '.original'), '') as original_path,
           nullif((select value from public.site_content where key = c.key || '.crop'), '') as crop,
           coalesce((select value from public.site_content where key = c.key || '.alt'), '') as alt
      from public.site_content c
     where c.value <> ''
       and c.key !~ '\.(original|crop|alt)$'
       and exists (select 1 from storage.objects o where o.bucket_id = 'site-images' and o.name = c.value)
  loop
    insert into public.media (name, path, original_path, settings, alt, size, mime_type, original_size)
    values (
      regexp_replace(r.path, '^.*/', ''),
      r.path,
      r.original_path,
      r.crop::jsonb,
      r.alt,
      (select (metadata->>'size')::int from storage.objects where bucket_id = 'site-images' and name = r.path),
      (select metadata->>'mimetype' from storage.objects where bucket_id = 'site-images' and name = r.path),
      (select (metadata->>'size')::int from storage.objects where bucket_id = 'site-images' and name = r.original_path)
    )
    returning id into new_id;

    update public.site_content set value = new_id::text, updated_at = now() where key = r.key;
    delete from public.site_content where key in (r.key || '.original', r.key || '.crop', r.key || '.alt');
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Pages. Home and Menu are built-in "system" pages (system_key set): they can be
-- renamed, hidden from navigation and given SEO text, but not deleted, unpublished
-- or moved. Other pages are created from the dashboard and served at /<slug>.
-- Page content lives in site_content under "<system_key>." or "page-<id>." keys.
-- ---------------------------------------------------------------------------
create table if not exists public.pages (
  id              uuid primary key default gen_random_uuid(),
  system_key      text unique,
  slug            text not null unique,
  title           text not null,
  nav_label       text,
  show_in_nav     boolean not null default true,
  nav_order       integer not null default 0,
  published       boolean not null default false,
  template        text not null default 'basic',
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint pages_slug_format check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' or (system_key = 'home' and slug = '')
  )
);

alter table public.pages enable row level security;

-- Visitors only see published pages; signed-in users also see drafts.
drop policy if exists "Public read published pages" on public.pages;
create policy "Public read published pages" on public.pages
  for select to anon using (published);

drop policy if exists "Authenticated read pages" on public.pages;
create policy "Authenticated read pages" on public.pages
  for select to authenticated using (true);

drop policy if exists "Authenticated insert pages" on public.pages;
create policy "Authenticated insert pages" on public.pages
  for insert to authenticated with check (system_key is null);

drop policy if exists "Authenticated update pages" on public.pages;
create policy "Authenticated update pages" on public.pages
  for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated delete pages" on public.pages;
create policy "Authenticated delete pages" on public.pages
  for delete to authenticated using (system_key is null);

-- System pages keep their address, key, template and published state no matter what's sent.
create or replace function public.protect_system_pages()
returns trigger
language plpgsql
as $$
begin
  if old.system_key is not null then
    new.system_key := old.system_key;
    new.slug := old.slug;
    new.template := old.template;
    new.published := true;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists protect_system_pages on public.pages;
create trigger protect_system_pages
  before update on public.pages
  for each row execute function public.protect_system_pages();

insert into public.pages (system_key, slug, title, show_in_nav, nav_order, published, template)
values ('home', '', 'Home', true, 0, true, 'system'),
       ('menu', 'menu', 'Menu', true, 1, true, 'system')
on conflict (system_key) do nothing;

create or replace function public.reorder_pages(ids uuid[])
returns void
language sql
security invoker
as $$
  update public.pages p
     set nav_order = o.ord - 1
    from unnest(ids) with ordinality as o(id, ord)
   where p.id = o.id;
$$;

revoke execute on function public.reorder_pages(uuid[]) from anon, public;
grant  execute on function public.reorder_pages(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Page sections. Each page can have a list of sections built from layouts defined
-- in src/sections/ (`type`), with per-section `settings` (e.g. image left/right).
-- A section's text and images live in site_content under "section-<id>." keys.
-- ---------------------------------------------------------------------------
create table if not exists public.page_sections (
  id         uuid primary key default gen_random_uuid(),
  page_id    uuid not null references public.pages(id) on delete cascade,
  type       text not null,
  settings   jsonb not null default '{}'::jsonb,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists page_sections_page_position_idx
  on public.page_sections (page_id, position);

alter table public.page_sections enable row level security;

-- Visitors see sections of pages they can see (the pages policy hides drafts from them).
drop policy if exists "Public read page sections" on public.page_sections;
create policy "Public read page sections" on public.page_sections
  for select using (exists (select 1 from public.pages p where p.id = page_id));

drop policy if exists "Authenticated write page sections" on public.page_sections;
create policy "Authenticated write page sections" on public.page_sections
  for all to authenticated using (true) with check (true);

-- When a section is deleted (directly or with its page), delete its text/image placements.
-- Images themselves stay in the media library.
create or replace function public.delete_section_content()
returns trigger
language plpgsql
as $$
begin
  delete from public.site_content where key like 'section-' || old.id || '.%';
  return old;
end;
$$;

drop trigger if exists delete_section_content on public.page_sections;
create trigger delete_section_content
  after delete on public.page_sections
  for each row execute function public.delete_section_content();

create or replace function public.reorder_page_sections(ids uuid[])
returns void
language sql
security invoker
as $$
  update public.page_sections s
     set position = o.ord - 1, updated_at = now()
    from unnest(ids) with ordinality as o(id, ord)
   where s.id = o.id;
$$;

revoke execute on function public.reorder_page_sections(uuid[]) from anon, public;
grant  execute on function public.reorder_page_sections(uuid[]) to authenticated;

-- One-time migration: created pages used to have a single "body" text field. Move any
-- existing body text into a Text section at the top of the page. Safe to re-run.
do $$
declare
  r record;
  new_id uuid;
begin
  for r in
    select c.key, c.value, p.id as page_id
      from public.site_content c
      join public.pages p on c.key = 'page-' || p.id || '.body'
     where c.value <> ''
  loop
    insert into public.page_sections (page_id, type, position)
    values (r.page_id, 'text', -1)
    returning id into new_id;

    insert into public.site_content (key, value) values ('section-' || new_id || '.body', r.value);
    delete from public.site_content where key = r.key;
  end loop;
end
$$;
