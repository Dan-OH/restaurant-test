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
