# WriteANovel

WriteANovel is an offline-first novel studio built with Svelte 5, SvelteKit, IndexedDB, and PocketBase. Free writers do not need an account and their manuscripts stay in the browser. Authenticated premium writers can explicitly move their local library to PocketBase while retaining a complete offline cache.

## Start the application

Requirements: Docker with the Compose plugin.

```sh
docker compose up --build
```

Open:

- WriteANovel: <http://localhost:3000>
- PocketBase dashboard: <http://localhost:8090/_/>

The first start applies the schema in `pocketbase/pb_migrations`. PocketBase data is persisted in `pocketbase/pb_data` and excluded from Git.

To stop the application without deleting its data:

```sh
docker compose down
```

For a non-local deployment, copy `.env.example` to `.env` and set:

- `PUBLIC_POCKETBASE_URL` to the browser-reachable PocketBase URL. This value is compiled into the frontend, so rebuild after changing it.
- `PB_APP_URL` to the browser-reachable WriteANovel URL. PocketBase uses it in password-reset links.

## Storage behavior

### Free mode

- Uses IndexedDB through the local repository.
- Does not call the PocketBase manuscript API.
- Works without registration and remains available through the PWA service worker.

### Premium mode

- Uses PocketBase email/password registration and login.
- The account modal contains the temporary `is_premium` development toggle; a payment flow can replace that mutation later.
- Enabling premium presents an explicit local-to-cloud migration choice.
- PocketBase is authoritative after migration. IndexedDB remains the full offline cache and an outbox queues offline edits.
- Disabling premium stops cloud traffic but leaves the device copy intact.

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
- Installable offline PWA behavior.

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

`npm test` runs the unit and standard browser suites together. The premium test intentionally requires the live Compose backend:

```sh
docker compose up -d --build
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 POCKETBASE_E2E=true npm run test:e2e -- tests/e2e/account.spec.ts
```

The permanent Playwright scenarios cover:

- local project creation, chapter insertion, notes, reload persistence, and zero anonymous backend requests;
- direct PDF and EPUB downloads;
- front/back pages, PNG/SVG covers, inline SVG alignment and resizing, and resize persistence;
- service-worker installation and continued writing after the browser is put offline;
- registration, explicit premium migration, and restoration from PocketBase in a fresh browser profile.

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
