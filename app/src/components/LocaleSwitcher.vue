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
  <div class="inline-flex rounded-[10px] bg-mist-100 p-[3px] text-[12.5px]">
    <button
      v-for="l in SUPPORTED_LOCALES"
      :key="l"
      type="button"
      class="rounded-lg px-4.5 py-1.5 transition-colors"
      :class="locale === l ? 'bg-white font-bold shadow-card' : 'font-semibold text-ink-500 hover:text-ink-600'"
      @click="setLocale(l)"
    >
      {{ t(`settings.locales.${l}`) }}
    </button>
  </div>
</template>
