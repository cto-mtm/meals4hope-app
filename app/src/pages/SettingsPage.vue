<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import LocaleSwitcher from '../components/LocaleSwitcher.vue'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

async function logout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="mx-auto max-w-[720px]">
    <h1 class="mb-5 text-[22px] font-bold tracking-[-0.3px]">{{ t('settings.title') }}</h1>

    <!-- Language -->
    <section class="rounded-card bg-white px-5 py-5 shadow-card">
      <h2 class="text-[13.5px] font-bold">{{ t('settings.language') }}</h2>
      <p class="mt-0.5 text-[12.5px] text-ink-400">{{ t('settings.languageHint') }}</p>
      <div class="mt-3.5">
        <LocaleSwitcher />
      </div>
    </section>

    <!-- Account -->
    <section class="mt-3.5 rounded-card bg-white px-5 py-5 shadow-card">
      <h2 class="mb-2 text-[13.5px] font-bold">{{ t('settings.account') }}</h2>
      <dl class="text-[13px]">
        <div class="flex justify-between gap-4 border-b border-line-100 py-2.5">
          <dt class="text-ink-500">{{ t('contacts.name') }}</dt>
          <dd class="font-semibold">{{ auth.user?.name }}</dd>
        </div>
        <div class="flex justify-between gap-4 border-b border-line-100 py-2.5">
          <dt class="text-ink-500">{{ t('login.email') }}</dt>
          <dd class="font-semibold">{{ auth.user?.email }}</dd>
        </div>
        <div class="flex justify-between gap-4 py-2.5">
          <dt class="text-ink-500">{{ t('admin.form.role') }}</dt>
          <dd class="font-semibold">{{ auth.user ? t(`admin.roles.${auth.user.role}`) : '—' }}</dd>
        </div>
      </dl>
    </section>

    <!-- Log out -->
    <section class="mt-3.5 flex items-center justify-between gap-4 rounded-card bg-white px-5 py-5 shadow-card">
      <div>
        <h2 class="text-[13.5px] font-bold">{{ t('settings.logoutTitle') }}</h2>
        <p class="mt-0.5 text-[12.5px] text-ink-400">{{ t('settings.logoutHint') }}</p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-[9px] border border-danger-200 bg-white px-4 py-2 text-[12.5px] font-semibold text-danger-600 hover:bg-red-50"
        @click="logout"
      >
        {{ t('shell.logout') }}
      </button>
    </section>
  </div>
</template>
