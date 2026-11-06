# Restaurant Website

Vite + React (plain JS) restaurant site, editable in place by logged-in staff, with a dashboard for
pages, images and settings. Data lives in Supabase.

- `/` – homepage
- `/menu` – the menu
- `/<slug>` – pages created in the dashboard (unknown addresses show a "Page not found" page)
- `/login` – staff login (linked as "Staff login" in the footer)
- `/admin` – dashboard

## Editing the site

Once logged in, a sticky **admin bar** appears above the site. Click **Edit page** to put the site into
edit mode:

- Every piece of page text gets a dashed outline. Click it, type, then click away (or press Enter)
  to save. Escape cancels. Multi-line fields like opening hours accept Enter for new lines.
- **Images:** every image spot (the homepage hero, section images…) has an **Edit image** button
  (**Add image** when empty), or drop a file anywhere on the spot. It opens the image dialog:
  - **Sizes come from the spot**, not the crop tool: the homepage hero is 1920×720, created pages'
    headers 1920×600, and section images use the section's **Image size** setting (e.g. the Image
    section defaults to 1920×1080). The cropper is locked to that shape and the result is scaled to
    that width. Smaller images can still be used, with a warning that they may look blurry.
  - **Upload a new image** (cropped to the spot's size first), or **Choose from Assets**: an asset
    with the spot's shape can be used as is (**Use this image**; crop, alt text and optimization are
    shared with everywhere it's used) or as a separate copy (**Crop a new version**). An asset with a
    different shape gets **Crop to fit**, which makes a fitted version from the same original, with
    nothing uploaded again.
  - If the image doesn't match the spot's size (e.g. after changing a section's image size), the
    **Edit image** button turns orange and the dialog offers **Crop to fit**.
  - Below that, the same editor as the Assets page: preview, **Crop** (previous crop restored),
    details, where it's used, alt text, and **Optimize** (format and quality) with the before/after compare.
  - **Remove from this spot** takes it off the page; it stays in Assets.
- **Variables:** while editing text, type `{{` (or click **Insert variable** in the admin bar) to
  insert a site variable such as the address or phone number. It shows as a tinted chip in edit mode
  and as plain text to visitors, and always displays the variable's current value. Hover a chip for
  its details (value, description, where it's used, last updated); click it to edit the variable.
- **Page sections:** every page can have sections, which are blocks built from layouts defined in
  `src/sections/`. In edit mode, **Add section** (between sections, or the box at the bottom) opens a
  layout picker: Text, Text with image, Image, Two images. Each section has a toolbar to move it
  up or down, open its **settings** (e.g. image on the left or right, contained or full-width image;
  changes apply instantly), or delete it (type its heading or layout name to confirm). Fill in its
  text and images in place like the rest of the page.
- On the menu page, the menu switches to the menu editor: add, edit, delete and drag (⠿) to
  reorder sections and items.
- The admin bar shows save status. Edit mode stays on as you move between pages until you click
  **Done editing**.

The admin bar also links to the **Dashboard** (`/admin`), where site-wide settings live:

- **Pages:** every page, including the built-in Home and Menu. Drag to set the navigation order.
  **New page** asks for a title (the URL is generated from it), a template, and whether to show it in
  the navigation; pages start as drafts. Each page has **Edit content** (opens it in edit mode),
  **settings** (title, URL, navigation label, show in navigation, published/draft, SEO title and
  description) and **delete** (type the title to confirm; its images stay in Assets). Built-in pages
  can be renamed, hidden from navigation and given SEO text, but not deleted, unpublished or moved.
  On the site, the admin bar shows **Page settings** for the current page and a **Draft** badge on
  unpublished pages, which visitors can't see.
- **Assets:** every uploaded image, with where it's used (page chips; links to each page), size and
  format, and warnings for missing alt text. Search; sort by date, name, file size, dimensions or
  usage; group by page or by feature (hero images, slideshows…); filter by in use / not used / missing
  alt text. Sort and grouping choices are remembered in your browser. Open an
  image to edit its alt text, re-crop it (at the size it was made for), **optimize** it (format
  WebP/AVIF/JPEG and quality, with a live before/after file size preview), or delete it (also removes it from
  any page using it).
- **Variables:** reusable text (address, phone, restaurant name…). Create, edit and delete
  variables; each shows its `{{key}}` token (click to copy), its value and which pages use it.
  Changing a value updates it everywhere. Renaming a key rewrites every use; deleting a variable
  writes its current value into the places that used it, so nothing disappears.
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
- **Pages:** the `pages` table holds every page; the header navigation is built from it (published,
  "show in navigation", ordered by `nav_order`). Row Level Security only returns drafts to signed-in
  users, and a trigger stops built-in pages from being deleted, unpublished or moved. Content for a
  page is stored in `site_content` under its prefix: `home.` / `menu.` for built-in pages and
  `page-<id>.` for created pages (so renaming a URL never loses content). Created pages render through
  a template (`template` column; currently `basic`: optional header image, heading, intro, then the page's sections),
  in `src/pages/DynamicPage.jsx`. To add a template, add it to `TEMPLATES` in `src/lib/pages.js` and a
  case in `PageTemplate`.
- **Variables:** `site_variables` rows (`key`, `label`, `value`, `description`). Any `EditableText`
  value can contain `{{key}}` tokens; visitors see them replaced with the value, and SEO titles and
  descriptions are resolved too. In edit mode `src/components/editableDom.js` renders tokens as
  non-editable chips and turns them back into tokens on save; `src/admin/variables/VariablePicker.jsx`
  is the insert popup. `schema.sql` seeds `restaurant_name`, `address` and `phone`, and uses them in
  the header, footer and homepage text unless those were already edited. Helpers: `src/lib/variables.js`.
- **Page sections:** `page_sections` rows (`page_id`, `type`, `settings` JSON, `position`). A
  section's text and images are stored in `site_content` under `section-<id>.<field>`; a database
  trigger deletes them when the section (or its page) is deleted. Images stay in Assets. Layouts are
  defined in code:
  - `src/sections/types.js`: label, description, `settings` (generates the settings menu) and image
    slots for each layout.
  - `src/sections/index.js`: maps each type to its component (`TextSection.jsx` etc.). Components get
    `{ prefix, settings }` and use `EditableText` / `EditableImage` with ids `${prefix}.<field>`.
  - `src/admin/sections/`: the edit-mode toolbar, settings menu, "Add section" picker and its
    schematic previews.
  - Styles: `src/styles/_sections.scss`.

  To add a layout, follow the checklist at the top of `src/sections/types.js`. Created pages show
  their sections below the header; Home and Menu show them below their built-in content.
- **Page text:** `site_content` stores text edits as key/value rows. In code, text is wrapped in
  `<EditableText id="home.hero.title" as="h1">Default text</EditableText>`. The children are the default,
  shown until someone saves an edit under that `id`. To make new text editable, wrap it the same way
  with a new unique `id`.
- **Images:** a media library. Each image is a row in the `media` table: the file visitors see
  (`path`), the uncropped original (`original_path`, max 3200px), the `settings` used to render one
  from the other (`{ target, area, format, quality }`: `target` is the size the image is for,
  `area` the crop in original pixels), alt text, dimensions and file sizes. Image sizes are set by
  where an image goes: `<EditableImage size={{ width, height }}>` in templates, and "WIDTHxHEIGHT"
  choice settings for sections (see `src/sections/types.js`). The output is exactly the target size
  when the original is big enough, otherwise the crop's own size at the same shape.
  Image files are stored in the public `site-images` Supabase Storage bucket (10 MB limit, images only).
  Cropping and optimizing always re-render from the original, so repeated edits never lose quality.
  Placements on the page (`<EditableImage id="home.hero.image" ...>`) store a media id in
  `site_content`, so an edit in Assets updates every page using that image.
- **Duplicate uploads:** originals are shared through the `media_sources` table, keyed by a SHA-256
  hash of the uploaded file. Uploading an image that's already stored reuses that original (no second
  upload) but still creates a new asset with its own crop, size and alt text, so the same photo can
  be cropped differently on different pages. Deleting an asset only deletes the shared original once
  no other asset uses it. Rendered (cropped/optimized) files are per asset.
- **Image placement names:** `<page>.<feature>.<name>`, e.g. `home.hero.image`. The file manager
  reads the page and feature from the name to show "Used on" and to group images. A placement's value
  is one media id, or a JSON array of ids for features with several images: a future slideshow saved
  as `home.slideshow.main = ["id1","id2"]` automatically appears under **Slideshows**, labelled
  "Main slideshow · image 2 of 5". Register display names and ordering for new pages and features in
  `PAGES` / `FEATURES` in `src/lib/media.js`.
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
    PageSections.jsx           renders a page's sections; lazy-loads section editing in edit mode
    editableDom.js             edit-mode DOM helpers: variable chips, serializing, caret
  pages/                       Home, Menu (lazy-loads the menu editor in edit mode),
                               DynamicPage (created pages + templates), NotFound
  sections/                    page section layouts: types.js (metadata), index.js (components),
                               TextSection, TextImageSection, ImageSection, TwoImagesSection
  admin/                       all admin UI (MUI)
    theme.js, AdminTheme.jsx   MUI theme and provider (includes ConfirmProvider)
    confirm.js, ConfirmProvider.jsx  useConfirm(): MUI confirm/alert dialogs, type-to-confirm deletes
    AdminBar.jsx               sticky logged-in bar with the edit-mode toggle
    ImageControls.jsx          "Edit image" button + image dialog for an EditableImage spot
    AssetEditor.jsx            shared asset editor (crop, details, alt text, optimize); used by the
                               image dialog and the Assets page
    AssetPicker.jsx            "Choose from Assets" dialog
    mediaOps.js                create / re-render / delete media (shared by editor and Assets)
    usePersistentState.js      remembers view preferences (e.g. Assets sort) in localStorage
    ImageCropper.jsx           crop dialog locked to the spot's size (react-easy-crop)
    Login.jsx                  staff login page
    SortableList.jsx           drag & drop lists (menu editor, pages)
    FieldHint.jsx              helper text with a character counter
    menu/                      MenuEditor, SectionForm, ItemForm
    sections/                  page section toolbar + settings, Add section picker, previews
    variables/                 Variables dashboard page, variable dialog, insert-variable picker
    dashboard/                 AdminDashboard (routes + auth guard), AdminLayout, SiteSettings,
                               PagesManager, PageSettingsDialog,
                               AssetsManager, MediaDetails, OptimizePanel
  lib/
    supabase.js                Supabase client
    api.js                     all database and storage calls
    images.js                  in-browser resizing, cropping and re-encoding (canvas)
    AuthProvider.jsx           session state; useAuth.js for the hook
    SiteProvider.jsx           edit mode, page text, media library, save status; site.js for useSite()
    seo.js                     site title/description settings and usePageMeta()
    variables.js               {{key}} tokens: parsing, resolving, renaming, usage
    pages.js                   page paths, navigation, slugs, templates
    media.js                   placement naming (page/feature), usage lookup, size/format formatting
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
