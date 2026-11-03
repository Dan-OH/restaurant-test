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
- The homepage hero image has a panel in its top-right corner. **Add / Replace** (click or drag and
  drop a file) opens a crop & resize dialog: drag to position, zoom, pick a shape (21:9, 16:9, 3:2 or
  the original), and pick an output size. **Crop & resize** reopens the dialog with the previous crop
  restored. You can also set alt text, or **Remove** the image from the page (it stays in Files).
- On the menu page, the menu switches to the menu editor: add, edit, delete and drag (⠿) to
  reorder sections and items.
- The admin bar shows save status. Edit mode stays on as you move between pages until you click
  **Done editing**.

The admin bar also links to the **Dashboard** (`/admin`), where site-wide settings live:

- **Files:** every uploaded image, with where it's used (page chips; links to each page), size and
  format, and warnings for missing alt text. Filter by in use / not used / missing alt text. Open an
  image to edit its alt text, crop & resize it, **optimize** it (format WebP/AVIF/JPEG, quality,
  maximum width, with a live before/after file size preview), or delete it (also removes it from
  any page using it).
- **Site settings:** the website title (browser tab and search result headline; other pages show
  as "Menu · Title") and the meta description, with length guides and a search result preview.

To add a dashboard page, create it in `src/admin/dashboard/`, add a `<Route>` in `AdminDashboard.jsx`,
and add it to the `NAV` list in `AdminLayout.jsx`.

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
- **Images:** a media library. Each image is a row in the `media` table: the file visitors see
  (`path`), the uncropped original (`original_path`, max 3200px), the `settings` used to render one
  from the other (`{ aspect, area, width, format, quality }`), alt text, dimensions and file sizes.
  Files are stored in the public `site-images` Supabase Storage bucket (10 MB limit, images only).
  Cropping and optimizing always re-render from the original, so repeated edits never lose quality.
  Placements on the page (`<EditableImage id="home.hero.image" ...>`) store a media id in
  `site_content`, so an edit in Files updates every page using that image. The file manager works out
  the page from the first part of the placement id (`home.` → Home, `menu.` → Menu, `site.`/`footer.`
  → All pages; see `src/lib/media.js`). Name new placements the same way.
- **Settings:** dashboard settings are stored in `site_content` too, under `settings.*` keys
  (see `src/lib/seo.js`). `usePageMeta()` applies the title and description on each page.
  Search engines like Google run JavaScript and pick these up. Link previews on social media and
  chat apps don't run JavaScript, so they show the defaults in `index.html`.
- **Security:** Row Level Security lets anyone read the menu, but only signed-in users can insert,
  update or delete. The publishable key is safe to ship in the browser because of these policies.
- **Reordering:** dragging a section or item updates the UI right away and calls the
  `reorder_sections` / `reorder_items` database functions, which save the new order in one
  transaction. If a save fails, the editor shows the error and reloads from the database.

## Styling: public site vs admin

- **Public site** (header, homepage, menu, footer): custom SCSS in `src/styles/`, with its own look
  and feel. `_variables.scss` holds colors, fonts and breakpoints.
- **Admin UI** (admin bar, edit controls, menu editor, image cropper, login, dashboard): built with
  [MUI](https://mui.com/material-ui/) and lives in `src/admin/`. The MUI theme is in
  `src/admin/theme.js`; each admin entry point wraps itself in `<AdminTheme>`. MUI's global
  CssBaseline is deliberately **not** used, so MUI never restyles the public site.
- Admin modules are loaded with `React.lazy` only when needed (logged in, edit mode on, or on
  `/login` / `/admin`), so visitors never download MUI. Keep new admin UI inside `src/admin/` and
  import it lazily from public code.
- **Dialogs:** never use `window.confirm` / `window.alert` in admin UI. Use `useConfirm()` from
  `src/admin/confirm.js`, which shows an MUI dialog and returns a promise. For anything that deletes,
  pass `confirmText` (the item's name) and `danger: true`: the user types the name to enable the button.
  Pasting is allowed and the match ignores case and surrounding spaces.
- The in-place text outline in edit mode (`.editable` in `_editable.scss`) stays in SCSS, since it
  decorates the site's own content.

## Project layout

```
src/
  App.jsx                      routes (admin routes lazy-loaded)
  components/                  public site components (custom SCSS)
    Layout.jsx                 header, nav, footer; lazy-loads the admin bar when logged in
    EditableText.jsx           text that becomes editable in edit mode
    EditableImage.jsx          image; lazy-loads its edit controls in edit mode
  pages/                       Home, Menu (lazy-loads the menu editor in edit mode)
  admin/                       all admin UI (MUI)
    theme.js, AdminTheme.jsx   MUI theme and provider (includes ConfirmProvider)
    confirm.js, ConfirmProvider.jsx  useConfirm(): MUI confirm/alert dialogs, type-to-confirm deletes
    AdminBar.jsx               sticky logged-in bar with the edit-mode toggle
    ImageControls.jsx          upload/crop/replace/remove panel for EditableImage
    mediaOps.js                create / re-render / delete media (shared by editor and Files)
    ImageCropper.jsx           crop & resize dialog (react-easy-crop)
    Login.jsx                  staff login page
    menu/                      MenuEditor, SortableList (drag & drop), SectionForm, ItemForm
    dashboard/                 AdminDashboard (routes + auth guard), AdminLayout, SiteSettings,
                               FileManager, MediaDetails, OptimizePanel
  lib/
    supabase.js                Supabase client
    api.js                     all database and storage calls
    images.js                  in-browser resizing, cropping and re-encoding (canvas)
    AuthProvider.jsx           session state; useAuth.js for the hook
    SiteProvider.jsx           edit mode, page text, media library, save status; site.js for useSite()
    seo.js                     site title/description settings and usePageMeta()
    media.js                   placement → page mapping, file size/format formatting
    useSignOut.js              sign out + leave edit mode
  styles/                      public site SCSS; main.scss imports the partials
supabase/
  schema.sql                   tables, RLS policies, reorder functions, storage bucket,
                               media library + migration (safe to re-run)
  seed.sql                     sample data
```

## Deploying

`npm run build` outputs static files to `dist/`. Any static host works (Netlify, Vercel, Cloudflare
Pages). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as environment variables on the
host, and configure a SPA fallback so routes like `/menu` serve `index.html`.
