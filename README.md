# Meals4Hope — Donation Campaign Tracker

Internal webapp for the Meals4Hope non-profit: record, track, and give visibility to money/resources coming in (**Entradas**) and aid going out (**Salidas**).

**What's in the box:** Vue 3 + Vite + Tailwind 4 app (wrapped by Capacitor for iOS/Android), Firestore + Firebase Auth + Storage, one Cloud Function for user provisioning, full local dev via the Firebase Emulator Suite (no Firebase account needed), View-Transitions animation system, typed vue-i18n (es primary / en fallback), field-level audit log on every mutation, soft deletes everywhere.

## Quick start — fully local, no Firebase account

```bash
npm i -g firebase-tools                      # once

# Terminal 1 — backend (offline emulators, demo- project id)
cd firebase/functions && npm install && npm run build
cd .. && npm run emulators                   # Auth :9099, Firestore :8080, Storage :9199, Functions :5001, UI :4000
npm run seed                                 # admin@meals4hope.org / meals4hope + catalogs
# or: npm run seed:demo                      # + sample aliados, entradas, salidas, facturas

# Terminal 2 — app
cd app && npm install
cp .env.example .env
npm run dev                                  # http://localhost:5173
```

Log in with `admin@meals4hope.org` / `meals4hope`. The `demo-meals4hope` project id keeps the Emulator Suite fully offline — it never touches real Firebase resources and needs no `firebase login`, so the scaffold runs on day one with `.firebaserc` untouched.

**Daily workflow:** terminal 1 runs `npm run emulators` (or `emulators:persist` to keep data between restarts); terminal 2 runs `npm run dev`. For the tightest loop on API changes, run `npm run build:watch` in `firebase/functions/` alongside `npm run emulators:watch` — the emulator hot-reloads functions when `lib/` changes.

## Domain in 30 seconds

Entradas = third-party initiatives that raise money for M4H (a restaurant donates €1 per arepa). Salidas = support actions M4H executes (equipment for firefighters). Separate entities, shared taxonomies (Áreas de Atención, Líneas de Acción — admin-editable catalogs), shared partners/contacts/attachments/audit. Amounts stored as integer cents + currency; totals never sum across currencies. Nearly everything is nullable — records are created early and completed over time; `estado` signals completeness.

## How to add a hero transition

Give the source element and the target element the same id-derived `view-transition-name` (`:style="{ viewTransitionName: 'salida-' + s.id }"` on both pages) — the browser morphs them automatically. Never a static name in a `v-for`. Full recipes: `docs/animations.md`.

## How to add a translated string / locale

Add the key to **both** `es` and `en` in the feature's module under `app/src/i18n/locales/` — `en` is typed `typeof es`, so forgetting one is a compile error. New locales: type them against `es` too. Full recipes: `docs/i18n.md`.

## How to add an API endpoint

Add a zod schema to `firebase/functions/src/models.ts`, a route branch in `api.ts`, call it via `apiFetch()` from `app/src/lib/api.ts`. Testable immediately against the emulator. (Most features don't need this — the app talks to Firestore directly through `src/lib/db.ts`, which handles audit logging. Only Admin-SDK work belongs in the function.)

## Going native

```bash
cd app && npm run build
npx cap add ios && npx cap add android      # one-time
npm run cap:assets                          # after dropping icon.png/splash.png into app/assets/
npx cap sync && npx cap open ios            # or: android
```

The API CORS allow-list already includes the Capacitor origins (`capacitor://localhost`, `http://localhost`) and the Android back button is handled in `src/lib/native.ts`. For production native builds, point `.env` at your real Firebase project (`VITE_USE_EMULATORS=false`).

## Sign-in methods

Email/password and **Google** (members only — a Google account whose email was never provisioned by an admin is rejected). When creating a member, the password is optional: leave it empty for Google-only members. The Auth emulator fakes the Google popup locally with no setup; in production, enable the Google provider in Firebase console → Authentication → Sign-in method. Google popup sign-in is web-only — inside the native shells use email/password (or add `@capacitor-firebase/authentication` later).

## Deploy

1. Create a Firebase project (Blaze plan for functions), set its id in `.firebaserc`.
2. In `app/.env`: real `VITE_FIREBASE_*` values, `VITE_API_URL=https://us-central1-<project>.cloudfunctions.net/api`, `VITE_USE_EMULATORS=false`.
3. Add your hosting domain to the CORS allow-list in `firebase/functions/src/helpers/cors.ts`.
4. `./scripts/deploy.sh` — the one true deploy path (builds the app, copies `dist` → `firebase/app/`, deploys hosting + functions + rules).
5. Seed production: create the first admin user manually in the Firebase console (Auth user + `users/{uid}` doc with `role: 'admin'`, `activo: true`), and the catalogs via the Admin page.

## Keeping dependencies fresh

Versions in `package.json` are pinned to the dates this scaffold was
generated. They're intentionally NOT auto-updated on install — the goal is
that `npm install && npm run dev` always works on day one.

Recommended workflow when starting from this scaffold:

1. `npm install` in both `app/` and `firebase/functions/` and confirm
   `npm run dev` boots cleanly.
2. Commit the scaffold as your baseline (`git commit -m "initial scaffold"`).
3. Run `npm outdated` in each folder to see drift, and `npm audit` for
   security issues.
4. Upgrade deliberately — one major version at a time, testing between each.
   Watch especially for breaking changes in Vite, Capacitor, Tailwind,
   Firebase, and zod (these have all shipped breaking majors in the past).
5. After upgrading, re-run `npm run dev`, click through a hero transition
   and the login flow before committing.

Avoid running `npm update` blindly — it will pull breaking majors without
warning and you'll lose the "clean baseline" property.
