# Animation Cookbook

Two primitives only. No motion libraries, no GSAP, no JS tweening.

1. **View Transitions API** for *between-page* animations (the wrapper lives in `src/router/index.ts` — never call `document.startViewTransition` anywhere else).
2. **Vue `<Transition>` / `<TransitionGroup>`** for *within-page* enter/leave (modals, list items).

All transition CSS lives in `src/assets/css/transitions.css` as numbered recipes.

## 1. Add a hero transition between two pages

The Flutter-`Hero` equivalent. Reference implementation: Entradas/Salidas list card → detail header.

1. On the **source** element (list page): `:style="{ viewTransitionName: 'salida-' + s.id }"`
2. On the **target** element (detail page): the **same name** — `:style="{ viewTransitionName: 'salida-' + salida.id }"`
3. Done. The browser matches the names across the navigation and morphs position/size automatically. Timing is tuned globally by Recipe 2.

**Critical rule:** a `view-transition-name` must be unique per page at any moment. Never put a static name in a `v-for` — always derive it from the record id.

## 2. Add a custom per-page transition

Example — slide-in for the dashboard:

```css
/* transitions.css */
::view-transition-new(dashboard-page) {
  animation: 250ms cubic-bezier(0.4, 0, 0.2, 1) slide-in;
}
@keyframes slide-in {
  from { opacity: 0; transform: translateX(24px); }
}
```

```html
<!-- DashboardPage.vue root element -->
<div style="view-transition-name: dashboard-page">
```

## 3. Animate a list reorder/insert/remove

Wrap the list in `<TransitionGroup name="list" tag="ul">` and give items stable `:key`s. Recipe 4 in `transitions.css` supplies `.list-enter-*`, `.list-leave-*`, and `.list-move` (FLIP). For modals/bottom-sheets use `<Transition name="sheet">` (Recipe 5 — already used by `BaseModal.vue`).

## 4. The rules

- Animate **only `transform` and `opacity`** (compositor-friendly).
- Durations 200–350ms. Easing `cubic-bezier(0.4, 0, 0.2, 1)`.
- `view-transition-name`s unique per page, derived from ids.
- Always test with reduced motion enabled (Recipe 3 kills everything).
- Never nest `startViewTransition` calls; only the router wrapper calls it.
- Every recipe must look acceptable as a plain cross-fade — that's the automatic fallback.

## 5. Platform support

Chromium (incl. Android WebView) since 111; iOS WKWebView since iOS 18. On anything older the router wrapper silently degrades to instant navigation — that's the designed fallback, not a bug.
