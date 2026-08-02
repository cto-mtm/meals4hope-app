import { nextTick } from 'vue'
import { createRouter, createWebHistory, START_LOCATION } from 'vue-router'
import { useAuthStore } from '../stores/auth'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('../pages/LoginPage.vue'), meta: { public: true } },
    { path: '/', name: 'dashboard', component: () => import('../pages/DashboardPage.vue') },

    // Entradas renamed to Iniciativas in the 2026 redesign — the Firestore
    // collection is still `entradas`; only routes/UI say "iniciativas".
    { path: '/iniciativas', name: 'iniciativas', component: () => import('../pages/IniciativasListPage.vue') },
    { path: '/iniciativas/nueva', name: 'iniciativa-new', component: () => import('../pages/IniciativaFormPage.vue') },
    { path: '/iniciativas/:id', name: 'iniciativa-detail', component: () => import('../pages/IniciativaDetailPage.vue') },
    { path: '/iniciativas/:id/editar', name: 'iniciativa-edit', component: () => import('../pages/IniciativaFormPage.vue') },
    // Old bookmarks keep working after the rename.
    { path: '/entradas', redirect: { name: 'iniciativas' } },
    { path: '/entradas/:sub(.*)', redirect: (to) => `/iniciativas/${to.params.sub as string}` },

    // Salidas are hidden for now (nav + routes removed). The pages, locale
    // modules, and Firestore data stay intact — restore by re-adding these:
    // { path: '/salidas', name: 'salidas', component: () => import('../pages/SalidasListPage.vue') },
    // { path: '/salidas/nueva', name: 'salida-new', component: () => import('../pages/SalidaFormPage.vue') },
    // { path: '/salidas/:id', name: 'salida-detail', component: () => import('../pages/SalidaDetailPage.vue') },
    // { path: '/salidas/:id/editar', name: 'salida-edit', component: () => import('../pages/SalidaFormPage.vue') },

    { path: '/socios', name: 'partners', component: () => import('../pages/PartnersListPage.vue') },
    { path: '/socios/:id', name: 'partner-detail', component: () => import('../pages/PartnerDetailPage.vue') },

    { path: '/ajustes', name: 'settings', component: () => import('../pages/SettingsPage.vue') },

    { path: '/admin', name: 'admin', component: () => import('../pages/AdminPage.vue'), meta: { admin: true } },
    { path: '/actividad', name: 'activity', component: () => import('../pages/ActivityPage.vue'), meta: { admin: true } },

    // Catch-all 404. Required because Firebase Hosting rewrites every URL
    // to index.html — without this, typos render an empty RouterView.
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../pages/NotFoundPage.vue'), meta: { public: true } },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

// ── AUTH GUARD ──────────────────────────────────────────────────
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.isAuthenticated) return { name: 'dashboard' }
  if (to.meta.admin && !auth.isAdmin) return { name: 'dashboard' }
})

// ── VIEW TRANSITION WRAPPER ─────────────────────────────────────
// Every navigation becomes a view transition when the browser supports
// it. Pages opt into specific effects purely via CSS in
// assets/css/transitions.css — this file never changes per-page.
// Unsupported browsers / reduced motion: instant navigation (by design).
//
// Sequence: beforeResolve snapshots the old page and lets the navigation
// proceed; the transition's update callback then waits until afterEach +
// nextTick — i.e. until Vue has ACTUALLY swapped the DOM — before the
// browser snapshots the new page. (A fixed frame delay here caused
// "Transition was aborted because of timeout in DOM update" errors.)
let finishTransition: (() => void) | undefined

router.beforeResolve((_to, from) => {
  if (from === START_LOCATION) return
  if (!document.startViewTransition) return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

  return new Promise<void>((resolve) => {
    const transition = document.startViewTransition!(
      () =>
        new Promise<void>((updateDone) => {
          finishTransition = updateDone
          resolve() // let vue-router proceed with the navigation
        })
    )
    // Aborted/skipped transitions (rapid navigation, tab hidden) reject
    // these promises — that's expected, never an error.
    transition.finished.catch(() => {})
    transition.updateCallbackDone.catch(() => {})
  })
})

router.afterEach(() => {
  // DOM is swapped one tick after the navigation is confirmed.
  nextTick(() => {
    finishTransition?.()
    finishTransition = undefined
  })
})
