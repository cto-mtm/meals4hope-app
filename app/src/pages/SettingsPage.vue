<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import LocaleSwitcher from '../components/LocaleSwitcher.vue'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()
const auth = useAuthStore()
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-xl font-bold">{{ t('settings.title') }}</h1>

    <!-- Language -->
    <section class="rounded-xl border border-stone-200 bg-white p-4">
      <h2 class="mb-1 text-sm font-semibold text-stone-700">{{ t('settings.language') }}</h2>
      <p class="mb-3 text-xs text-stone-400">{{ t('settings.languageHint') }}</p>
      <LocaleSwitcher />
    </section>

    <!-- Account -->
    <section class="rounded-xl border border-stone-200 bg-white p-4">
      <h2 class="mb-3 text-sm font-semibold text-stone-700">{{ t('settings.account') }}</h2>
      <dl class="space-y-2 text-sm">
        <div class="flex justify-between gap-4">
          <dt class="text-stone-400">{{ t('contacts.name') }}</dt>
          <dd class="font-medium">{{ auth.user?.name }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-stone-400">{{ t('login.email') }}</dt>
          <dd class="font-medium">{{ auth.user?.email }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-stone-400">{{ t('admin.form.role') }}</dt>
          <dd class="font-medium">{{ auth.user ? t(`admin.roles.${auth.user.role}`) : '—' }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>
