<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logoUrl from '../assets/logo.png'

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
  { name: 'dashboard', label: t('shell.nav.dashboard'), icon: 'M3 11l9-7 9 7v9H3z' },
  { name: 'iniciativas', label: t('shell.nav.iniciativas'), icon: 'M12 19V5M5 12l7-7 7 7' },
  { name: 'partners', label: t('shell.nav.partners'), icon: 'M9 11a3 3 0 100-6 3 3 0 000 6zm8 1.4a2.4 2.4 0 100-4.8 2.4 2.4 0 000 4.8zM4 19c0-2.8 2.2-5 5-5s5 2.2 5 5' },
  ...(auth.isAdmin
    ? [{ name: 'admin', label: t('shell.nav.admin'), icon: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z' }]
    : []),
  { name: 'settings', label: t('shell.nav.settings'), icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zm7-3a7 7 0 11-14 0 7 7 0 0114 0' },
])

function isActive(name: string): boolean {
  const current = String(route.name ?? '')
  return current === name || current.startsWith(name.slice(0, -1))
}

const initials = computed(() => {
  const name = auth.user?.name ?? ''
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
})
</script>

<template>
  <div class="flex min-h-dvh">
    <!-- Floating hamburger (mobile only) -->
    <button
      type="button"
      class="fixed top-3 left-3 z-20 mt-safe rounded-lg border border-line-200 bg-white p-2 text-ink-600 shadow-sm md:hidden"
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
      class="fixed top-0 left-0 z-40 flex h-dvh w-56 shrink-0 -translate-x-full flex-col bg-navy-900 px-3.5 pt-safe pb-safe text-white transition-transform duration-200 md:sticky md:translate-x-0 md:transition-none"
      :class="open ? 'translate-x-0 shadow-xl md:shadow-none' : ''"
    >
      <div class="flex items-center justify-between py-5 pr-1 pl-2">
        <RouterLink :to="{ name: 'dashboard' }" class="flex items-center gap-2.5" @click="open = false">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white">
            <img :src="logoUrl" alt="Meals4Hope" class="h-7 w-7 object-contain" />
          </span>
          <span class="text-[15px] font-bold whitespace-nowrap">meals4hope</span>
        </RouterLink>
        <!-- Close (mobile only) -->
        <button
          type="button"
          class="rounded-lg p-1.5 text-white/60 hover:bg-white/10 md:hidden"
          :aria-label="t('shell.closeMenu')"
          @click="open = false"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <nav class="flex flex-1 flex-col gap-1">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="flex items-center gap-3 rounded-[9px] px-2.5 py-2.5 text-[13.5px] font-medium transition-colors"
          :class="isActive(item.name) ? 'bg-white/13 text-white' : 'text-white/62 hover:text-white'"
          @click="open = false"
        >
          <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path :d="item.icon" />
          </svg>
          <span class="whitespace-nowrap">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <!-- User + logout pinned to the bottom -->
      <div class="flex items-center gap-2.5 border-t border-white/14 px-2 pt-3 pb-1">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-leaf-500 text-xs font-bold text-leaf-900">
          {{ initials }}
        </span>
        <div class="flex min-w-0 flex-col leading-tight">
          <span class="truncate text-[12.5px] font-semibold">{{ auth.user?.name }}</span>
          <button type="button" class="w-fit text-[11px] text-white/55 hover:text-white" @click="logout">
            {{ t('shell.logout') }}
          </button>
        </div>
      </div>
    </aside>

    <main class="min-w-0 flex-1">
      <!-- Extra top padding on mobile clears the floating hamburger -->
      <div class="mx-auto max-w-5xl px-5 pt-16 pb-10 md:px-9 md:py-8">
        <slot />
      </div>
    </main>
  </div>
</template>
