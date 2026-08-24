# WriteANovel

WriteANovel is an offline-first novel studio built with Svelte 5, SvelteKit, IndexedDB, and PocketBase. Free writers do not need an account and their manuscripts stay in the browser. Authenticated premium writers can explicitly move their local library to PocketBase while retaining a complete offline cache.

## Start the application

Requirements: Docker with the Compose plugin.

```sh
docker compose up --build
```

Open:

- WriteANovel marketing site: <http://localhost:3000>
- Writing studio: <http://localhost:3000/app>
- PocketBase dashboard: <http://localhost:8090/_/>

The first start applies the schema in `pocketbase/pb_migrations`. PocketBase data is persisted in `pocketbase/pb_data` and excluded from Git.

To stop the application without deleting its data:

```sh
docker compose down
```

For a non-local deployment, copy `.env.example` to `.env` and set:

- `PUBLIC_POCKETBASE_URL` to the browser-reachable PocketBase URL. This value is compiled into the frontend, so rebuild after changing it.
- `PB_APP_URL` to the browser-reachable WriteANovel URL. PocketBase uses it in password-reset links.
- `ORIGIN` to the public application origin expected by the SvelteKit Node server.

The public SEO origin is `https://writeanovel.linus.solutions`. Canonical URLs, social metadata, structured data, `robots.txt`, and `sitemap.xml` use that origin from `src/lib/marketing/site.ts`.

## Public site and search visibility

- `/` is a prerendered marketing page for novel writing software.
- `/features`, `/offline-novel-writing`, `/novel-planning`, and `/book-typesetting` are substantive, internally linked search landing pages.
- Public marketing routes are server-rendered at build time and ship without client-side JavaScript.
- Each public page has a unique title and description, canonical URL, Open Graph and Twitter metadata, and JSON-LD structured data.
- `/app` and `/reset-password` carry `noindex` directives and are intentionally excluded from the sitemap.
- The installable PWA opens `/app` directly while keeping public pages crawlable at their own URLs.

After production deployment, submit `https://writeanovel.linus.solutions/sitemap.xml` in Google Search Console and validate the homepage with Google's Rich Results Test. Ranking is driven primarily by useful content, genuine references from other sites, and sustained performance; the technical setup makes the site eligible to be crawled and understood.

## Storage behavior

### Free mode

- Uses IndexedDB through the local repository.
- Does not call the PocketBase manuscript API.
- Works without registration and remains available through the PWA service worker.

### Premium mode

- Uses PocketBase email/password registration and login.
- The `is_premium` flag can only be changed by a PocketBase superuser, such as through the dashboard.
- Normal account creation and update requests cannot submit or change `is_premium`.
- After an administrator enables premium, the account modal presents an explicit local-to-cloud migration action.
- PocketBase is authoritative after migration. IndexedDB remains the full offline cache and an outbox queues offline edits.
- If an administrator disables premium, cloud traffic stops after the next authentication refresh while the device copy remains intact.

Password-reset requests need SMTP configured in the PocketBase dashboard before email can be delivered. The reset confirmation screen is served at `/reset-password`.

## Current writing features

- Multiple novel projects.
- Ordered chapters with insert-at-position and automatic display numbering.
- Front matter, back matter, front cover, and back cover.
- Characters, places, plotlines, and planning notes.
- WYSIWYG rich-text editing with headings, typography, links, lists, quotations, undo, and redo.
- Raster image and SVG insertion, alignment, and drag-to-resize controls.
- Trim-size and typography presets; 6 × 9 inches and Libre Baskerville are the defaults.
- Direct PDF download and EPUB 3 download, including book pages, artwork, and covers.
- Configurable PDF page-number ranges, restart/continuous sequences, Arabic/Roman numerals, templates, and placement.
- Installable offline PWA behavior.
- Prerendered public marketing pages with production SEO and social-sharing metadata.

## Development

Requirements: Node.js 24 and npm.

```sh
npm ci
npm run dev
```

The application source is TypeScript-only. `tsconfig.json` disables JavaScript input and a permanent policy test enforces typed Svelte script blocks and rejects broad escape-hatch types. Two JavaScript files are runtime-required exceptions outside the application source: Svelte's configuration file and PocketBase's migration file.

### Verification commands

```sh
npm run format:check
npm run check
npm run test:unit
npm run test:e2e
npm run build
```

`npm test` runs the unit and standard browser suites together. The premium test intentionally requires the live Compose backend and dedicated test superuser credentials. The supplied PocketBase image creates or updates that superuser from these environment variables:

```sh
PB_ADMIN_EMAIL=e2e-admin@example.test PB_ADMIN_PASSWORD=a-secure-test-password docker compose up -d --build
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 POCKETBASE_E2E=true PB_ADMIN_EMAIL=e2e-admin@example.test PB_ADMIN_PASSWORD=a-secure-test-password npm run test:e2e -- tests/e2e/account.spec.ts
```

Use different strong credentials for a deployed instance and keep them out of version control.

The permanent Playwright scenarios cover:

- server-rendered marketing copy, unique metadata, canonical URLs, structured data, sitemap, robots policy, and private-route `noindex` behavior;
- local project creation, chapter insertion, notes, reload persistence, and zero anonymous backend requests;
- direct PDF and EPUB downloads;
- visible PDF page-number ranges, formatting, placement, and local/cloud persistence;
- front/back pages, PNG/SVG covers, inline SVG alignment and resizing, and resize persistence;
- service-worker installation and continued writing after the browser is put offline;
- rejection of self-service premium upgrades, administrator-assigned premium migration, and restoration from PocketBase in a fresh browser profile.

## Architecture

```text
src/lib/domain/                 data types, factories, ordering rules
src/lib/application/            storage ports, orchestration, sync, UI state
src/lib/infrastructure/local/   Dexie database and local repository
src/lib/infrastructure/pocketbase/
                                account and cloud adapters
src/lib/editor/                 Tiptap extensions
src/lib/export/                 PDF, EPUB, HTML, and download helpers
src/lib/components/             small feature-oriented Svelte components
src/service-worker.ts           application shell and runtime caching
pocketbase/pb_migrations/       versioned backend schema
tests/e2e/                      production-build browser flows
```

The UI depends on application services, and application services depend on typed storage ports. IndexedDB and PocketBase are adapters behind those ports, keeping storage decisions out of Svelte components and making future changes localized.
