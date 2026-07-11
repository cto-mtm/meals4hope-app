# Architecture

## The pieces

- **`app/`** — Vue 3 + Vite SPA (TypeScript, Tailwind 4, Pinia, vue-router, vue-i18n). Vite builds into `app/dist/`; the same `dist/` is what Capacitor packages into the iOS/Android shells (`webDir: 'dist'`).
- **`firebase/`** — Firestore (data) + Firebase Auth (login) + Storage (attachments) + one Cloud Function (`api`) + Hosting config. `scripts/deploy.sh` copies `app/dist/` to `firebase/app/` where Hosting serves it with an SPA rewrite (`** → /index.html`, required because the router uses `createWebHistory`).

## Local-first development

The entire stack runs offline via the Firebase Emulator Suite under the `demo-meals4hope` project id — any `demo-` prefixed id makes the emulators never touch production resources and need no `firebase login`. `npm run emulators` in `firebase/` starts Auth (:9099), Firestore (:8080), Storage (:9199), Functions (:5001), and the Emulator UI (:4000). `npm run seed` creates the initial admin (`admin@meals4hope.org` / `meals4hope`) and the área/línea catalogs. The app connects to the emulators whenever `VITE_USE_EMULATORS=true` (default in dev).

Use `npm run emulators:persist` to keep data across emulator restarts (exports to `firebase/.emulator-data/` on exit).

## Data access pattern

The app talks to Firestore **directly** with the client SDK, guarded by `firestore.rules` (active member for CRUD, admin for users/catalogs, deletes blocked — soft deletes only). The one exception is **user provisioning**: creating Firebase Auth accounts requires the Admin SDK, so the admin panel calls the `api` Cloud Function (`POST /users`, `PATCH /users/:uid`) with the caller's ID token; the function verifies the token and checks the caller's `role` in Firestore.

Every mutation goes through `src/lib/db.ts` (`createEntity` / `updateEntity` / `softDeleteEntity`), which stamps `createdBy`/`updatedBy`, computes a field-level diff, and appends an `auditLogs` entry. This is what powers the per-record history tab and the global activity feed.

**Offline:** Firestore uses a persistent IndexedDB cache (multi-tab). Reads work offline from cache; mutations are optimistic — `db.ts` doesn't await server acknowledgement (awaiting would hang the UI offline), the SDK queues writes and syncs when connectivity returns, surviving app restarts. Attachment uploads (Storage) still require connectivity.

Lists are fetched whole and filtered client-side — an internal NGO tool has low data volume, and this avoids Firestore composite-index management. If volume ever grows, push filters into queries and add indexes to `firestore.indexes.json` (the auditLogs index there is the one query that already needs it).

## Domain

Entradas (money in, run by third parties) and Salidas (aid out, executed by M4H) are separate collections — their fields and lifecycles differ — sharing catalogs (áreas, líneas), organizations, contacts, facturas, attachments, and audit behavior. Amounts are integer minor units + ISO currency; totals group by currency and are never summed across currencies (no conversion in v1). Nearly every field is nullable so records can be created early with missing data — `estado` signals completeness.

## Navigation & animation

Route changes run through the View Transitions wrapper in `src/router/index.ts` with automatic degradation (unsupported browsers / reduced motion → instant navigation). Hero morphs (list card → detail header) come from matching `view-transition-name`s derived from record ids. See `docs/animations.md`.

## i18n

All user-facing strings flow through vue-i18n with typed per-feature modules; `es` is primary, `en` fallback. See `docs/i18n.md`.

## When you need deep links

Opening `https://yourdomain/entradas/abc` directly into the native app requires Universal Links (iOS: `apple-app-site-association` + Associated Domains entitlement) and App Links (Android: `assetlinks.json` + intent filters). Deliberately not scaffolded — see the official Capacitor deep-links guide (https://capacitorjs.com/docs/guides/deep-links). The SPA routes are already shaped to support it.
