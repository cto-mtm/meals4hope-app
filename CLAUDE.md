# Meals4Hope — Donation Campaign Tracker

Internal webapp for the Meals4Hope non-profit: records money/resources coming in
(**Entradas**) and aid going out (**Salidas**). UI language is Spanish; domain
fields in code are Spanish (the team thinks in these terms).

## Project Structure

- `app/` — Vue 3 + Vite web app, wrapped by Capacitor for iOS/Android
- `firebase/` — Firestore/Auth/Storage rules + Cloud Functions API + emulator scripts
- `docs/` — Internal documentation (read `docs/animations.md` before touching any animation, `docs/i18n.md` before touching any user-facing string)

## Development

- **Do not** run `vite build`, `npm run build`, `cap sync`, or any build commands unless explicitly asked.
- **Do not** prompt the user asking if they would like to run a build.
- The dev server (`npm run dev`) and the Firebase emulators (`npm run emulators` in `firebase/`) are managed by the user separately.
- Local dev never needs a real Firebase project — the emulators run offline under the `demo-meals4hope` project id. Seed local data with `npm run seed` in `firebase/`.
- Use `npm` as the package manager (not yarn or pnpm).

## Domain rules

- Entradas and Salidas are **separate entities** — never merge them into one collection with a type flag.
- Amounts are stored as **integer minor units** (`montoMinor`) + ISO `moneda`. Never sum across currencies.
- Almost every field is nullable by design — records are created early with missing data and completed over time. `estado` signals completeness, not required fields.
- **Soft deletes only** (`deletedAt`) on Entradas/Salidas/Facturas/Attachments. Nothing hard-deleted.
- Every mutation goes through `src/lib/db.ts` so the AuditLog entry (field-level diff) is written automatically. Never call `setDoc`/`updateDoc` directly from a page or store.
- Catalogs (Áreas de Atención, Líneas de Acción) are admin-editable Firestore collections, not hardcoded enums.

## i18n rules (non-negotiable)

- No hardcoded user-facing strings in templates or stores — every string is a key in a per-feature module under `src/i18n/locales/`, resolved with `useI18n()`'s `t()`.
- `es` is the source of truth; `en` is typed `typeof es`, so adding a string means adding it to **both** locales in the same change or `tsc` fails.

## Animation rules (non-negotiable)

- Page-to-page animation goes through the View Transitions wrapper in `src/router/index.ts` — never call `document.startViewTransition` anywhere else.
- Hero transitions = matching `view-transition-name` on source and target, derived from the record id. Names must be unique per page.
- Animate only `transform` and `opacity`. Durations 200–350ms.
- All transition CSS lives in `src/assets/css/transitions.css`, organized as numbered recipes.
- Every animation must degrade gracefully: reduced-motion and unsupported browsers get instant navigation.
