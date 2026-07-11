<script setup lang="ts">
// Segmented locale control (lives on the Settings page). The choice is
// persisted in localStorage and restored on startup (see i18n/index.ts).
import { useI18n } from 'vue-i18n'
import { LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, type SupportedLocale } from '../i18n'

const { locale, t } = useI18n({ useScope: 'global' })

function setLocale(l: SupportedLocale) {
  locale.value = l
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, l)
  } catch {
    /* private mode etc. — non-fatal */
  }
}
</script>

<template>
  <div class="inline-flex overflow-hidden rounded-lg border border-stone-300 bg-white text-sm font-medium">
    <button
      v-for="l in SUPPORTED_LOCALES"
      :key="l"
      type="button"
      class="px-4 py-2 transition-colors"
      :class="locale === l ? 'bg-brand-700 text-white' : 'text-stone-600 hover:bg-stone-100'"
      @click="setLocale(l)"
    >
      {{ t(`settings.locales.${l}`) }}
    </button>
  </div>
</template>
