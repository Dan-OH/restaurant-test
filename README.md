# Restaurant Website

Vite + React (plain JS) site with a homepage and menu, editable in place by logged-in staff. Data lives in Supabase.

- `/` – homepage
- `/menu` – the menu
- `/login` – staff login (linked as "Staff login" in the footer)

## Editing the site

Once logged in, a sticky **admin bar** appears above the site. Click **Edit page** to put the site into
edit mode:

- Every piece of page text gets a dashed outline. Click it, type, then click away (or press Enter)
  to save. Escape cancels. Multi-line fields like opening hours accept Enter for new lines.
- On the menu page, the menu switches to the menu editor: add, edit, delete and drag (⠿) to
  reorder sections and items.
- The admin bar shows save status. Edit mode stays on as you move between pages until you click
  **Done editing**.

## Setup

1. **Create a Supabase project** at <https://supabase.com>.
2. **Create the tables.** In the Supabase dashboard open **SQL Editor**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql) and run it. The script is safe to re-run, so run it
   again whenever it changes. Optionally run
   [`supabase/seed.sql`](supabase/seed.sql) for sample menu data.
3. **Create a login.** Go to **Authentication → Users → Add user**, enter an email and password,
   and tick "Auto confirm user". Then under **Authentication → Sign In / Providers**, turn off
   "Allow new users to sign up" so only users you add can log in.
4. **Connect the app.** Copy `.env.example` to `.env.local` and fill in:
   - `VITE_SUPABASE_URL`: click **Connect** at the top of the dashboard (or **Project Settings → Data API**).
     It looks like `https://<project-ref>.supabase.co`.
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: **Project Settings → API Keys → Publishable key**.
     Never use the Secret key in this app; it bypasses the security rules and would be exposed in the browser.
5. **Run it:**

   ```sh
   npm install
   npm run dev
   ```

## How it works

- **Menu data:** `menu_sections` and `menu_items` (items belong to a section; deleting a
  section deletes its items). Each has a `position` column used for ordering.
- **Page text:** `site_content` stores text edits as key/value rows. In code, text is wrapped in
  `<EditableText id="home.hero.title" as="h1">Default text</EditableText>`. The children are the default,
  shown until someone saves an edit under that `id`. To make new text editable, wrap it the same way
  with a new unique `id`.
- **Security:** Row Level Security lets anyone read the menu, but only signed-in users can insert,
  update or delete. The publishable key is safe to ship in the browser because of these policies.
- **Reordering:** dragging a section or item updates the UI right away and calls the
  `reorder_sections` / `reorder_items` database functions, which save the new order in one
  transaction. If a save fails, the editor shows the error and reloads from the database.

## Project layout

```
src/
  App.jsx                    routes
  components/Layout.jsx      admin bar, header, nav, footer
  components/AdminBar.jsx    sticky logged-in bar with the edit-mode toggle
  components/EditableText.jsx  text that becomes editable in edit mode
  components/menu/           MenuEditor, SortableList (drag & drop), SectionForm, ItemForm
  lib/supabase.js            Supabase client
  lib/api.js                 all database calls
  lib/AuthProvider.jsx       session state; lib/useAuth.js for the hook
  lib/SiteProvider.jsx       edit mode, page text, save status; lib/site.js for useSite()
  pages/                     Home, Menu, Login
  styles/                    SCSS: main.scss imports the partials;
                             _variables.scss holds colors, fonts and breakpoints
supabase/
  schema.sql                 tables, RLS policies, reorder functions (safe to re-run)
  seed.sql                   sample data
```

## Deploying

`npm run build` outputs static files to `dist/`. Any static host works (Netlify, Vercel, Cloudflare
Pages). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as environment variables on the
host, and configure a SPA fallback so routes like `/menu` serve `index.html`.
