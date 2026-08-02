<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
    <p class="text-5xl font-bold text-ink-300">404</p>
    <p class="text-sm text-ink-500">{{ t('notFound.message') }}</p>
    <RouterLink to="/" class="text-sm font-semibold text-brand-600 hover:underline">
      {{ t('notFound.home') }}
    </RouterLink>
  </div>
</template>
