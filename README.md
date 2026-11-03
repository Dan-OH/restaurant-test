# Restaurant Website

Vite + React (plain JS) site with a public homepage and menu, plus a login-protected menu editor backed by Supabase.

- `/` – homepage
- `/menu` – public menu, read from Supabase
- `/login` – staff login (Supabase email/password auth)
- `/admin` – create, edit, delete and drag-to-reorder menu sections and items

## Setup

1. **Create a Supabase project** at <https://supabase.com>.
2. **Create the tables.** In the Supabase dashboard open **SQL Editor**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql) and run it. Optionally run
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

- **Data:** two tables, `menu_sections` and `menu_items` (items belong to a section; deleting a
  section deletes its items). Each has a `position` column used for ordering.
- **Security:** Row Level Security lets anyone read the menu, but only signed-in users can insert,
  update or delete. The publishable key is safe to ship in the browser because of these policies.
- **Reordering:** dragging a section or item updates the UI right away and calls the
  `reorder_sections` / `reorder_items` database functions, which save the new order in one
  transaction. If a save fails, the editor shows the error and reloads from the database.

## Project layout

```
src/
  App.jsx                    routes
  components/Layout.jsx      header, nav, footer
  components/RequireAuth.jsx redirects to /login when signed out
  components/admin/          SortableList (drag & drop), SectionForm, ItemForm
  lib/supabase.js            Supabase client
  lib/menuApi.js             all database calls
  lib/AuthProvider.jsx       session state; lib/useAuth.js for the hook
  pages/                     Home, Menu, Login, AdminMenu
supabase/
  schema.sql                 tables, RLS policies, reorder functions
  seed.sql                   sample data
```

## Deploying

`npm run build` outputs static files to `dist/`. Any static host works (Netlify, Vercel, Cloudflare
Pages). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as environment variables on the
host, and configure a SPA fallback so routes like `/menu` serve `index.html`.
