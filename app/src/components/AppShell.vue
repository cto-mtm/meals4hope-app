<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

async function logout() {
  await auth.logout()
  router.push({ name: 'login' })
}

// Mobile: the sidebar is fully hidden; a floating hamburger slides it in
// as a drawer (transform-only animation) over a backdrop. Desktop (md+):
// permanent sticky sidebar, hamburger hidden. Navigating auto-closes.
const open = ref(false)

const navItems = computed(() => [
  { name: 'dashboard', label: t('shell.nav.dashboard'), icon: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10' },
  { name: 'entradas', label: t('shell.nav.entradas'), icon: 'M12 4v16m0-16l-5 5m5-5l5 5' },
  { name: 'salidas', label: t('shell.nav.salidas'), icon: 'M12 20V4m0 16l-5-5m5 5l5-5' },
  { name: 'partners', label: t('shell.nav.partners'), icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-6.9 4 4 0 004 6.9zm6-3a3 3 0 10-3-5' },
  ...(auth.isAdmin
    ? [{ name: 'admin', label: t('shell.nav.admin'), icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zm7-3a7 7 0 11-14 0 7 7 0 0114 0' }]
    : []),
  { name: 'settings', label: t('shell.nav.settings'), icon: 'M10.34 4.31a2 2 0 013.32 0l.5.74a2 2 0 001.87.86l.89-.09a2 2 0 012.06 2.6l-.27.85a2 2 0 00.46 2l.62.64a2 2 0 010 2.78l-.62.64a2 2 0 00-.46 2l.27.85a2 2 0 01-2.06 2.6l-.89-.09a2 2 0 00-1.87.86l-.5.74a2 2 0 01-3.32 0l-.5-.74a2 2 0 00-1.87-.86l-.89.09a2 2 0 01-2.06-2.6l.27-.85a2 2 0 00-.46-2l-.62-.64a2 2 0 010-2.78l.62-.64a2 2 0 00.46-2l-.27-.85a2 2 0 012.06-2.6l.89.09a2 2 0 001.87-.86l.5-.74z M12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z' },
])

function isActive(name: string): boolean {
  const current = String(route.name ?? '')
  return current === name || current.startsWith(name.slice(0, -1))
}
</script>

<template>
  <div class="flex min-h-dvh">
    <!-- Floating hamburger (mobile only) -->
    <button
      type="button"
      class="fixed top-3 left-3 z-20 mt-safe rounded-lg border border-stone-200 bg-white p-2 text-stone-600 shadow-sm md:hidden"
      :aria-label="t('shell.openMenu')"
      @click="open = true"
    >
      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <!-- Backdrop while the drawer is open (mobile only) -->
    <Transition name="sheet">
      <div v-if="open" class="fixed inset-0 z-30 bg-black/30 md:hidden" @click="open = false" />
    </Transition>

    <!-- Sidebar: hidden drawer on mobile (slides in), sticky column on md+ -->
    <aside
      class="fixed top-0 left-0 z-40 flex h-dvh w-56 shrink-0 -translate-x-full flex-col border-r border-stone-200 bg-white pt-safe pb-safe transition-transform duration-200 md:sticky md:translate-x-0 md:transition-none"
      :class="open ? 'translate-x-0 shadow-xl md:shadow-none' : ''"
    >
      <div class="flex items-center justify-between py-4 pr-2 pl-5 md:py-5">
        <RouterLink :to="{ name: 'dashboard' }" class="flex items-center gap-2" @click="open = false">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">
            M4
          </span>
          <span class="text-base font-bold tracking-tight whitespace-nowrap text-brand-800">
            Meals4Hope
          </span>
        </RouterLink>
        <!-- Close (mobile only) -->
        <button
          type="button"
          class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 md:hidden"
          :aria-label="t('shell.closeMenu')"
          @click="open = false"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <nav class="flex flex-1 flex-col gap-1 px-3">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
          :class="
            isActive(item.name)
              ? 'bg-brand-50 text-brand-800'
              : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
          "
          @click="open = false"
        >
          <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path :d="item.icon" />
          </svg>
          <span class="whitespace-nowrap">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <!-- User + logout pinned to the bottom -->
      <div class="border-t border-stone-100 px-3 py-3">
        <p class="truncate px-3 text-xs text-stone-400">{{ auth.user?.name }}</p>
        <button
          type="button"
          class="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
          @click="logout"
        >
          <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span class="whitespace-nowrap">{{ t('shell.logout') }}</span>
        </button>
      </div>
    </aside>

    <main class="min-w-0 flex-1">
      <!-- Extra top padding on mobile clears the floating hamburger -->
      <div class="mx-auto max-w-4xl px-4 pt-16 pb-6 md:py-6">
        <slot />
      </div>
    </main>
  </div>
</template>
