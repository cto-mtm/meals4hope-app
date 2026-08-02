<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { sendPasswordResetEmail } from 'firebase/auth'
import LocaleSwitcher from '../components/LocaleSwitcher.vue'
import { auth as firebaseAuth } from '../lib/firebase'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

async function logout() {
  await auth.logout()
  router.push({ name: 'login' })
}

/* Change password = self-service reset email. Avoids in-app reauth flows;
 * also how passwordless (Google-only) members set their first password. */
const resetState = ref<'idle' | 'sending' | 'sent' | 'error'>('idle')

async function sendPasswordEmail() {
  if (!auth.user?.email) return
  resetState.value = 'sending'
  try {
    await sendPasswordResetEmail(firebaseAuth, auth.user.email)
    resetState.value = 'sent'
  } catch {
    resetState.value = 'error'
  }
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

    <!-- Password -->
    <section class="mt-3.5 rounded-card bg-white px-5 py-5 shadow-card">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 class="text-[13.5px] font-bold">{{ t('settings.passwordTitle') }}</h2>
          <p class="mt-0.5 text-[12.5px] text-ink-400">{{ t('settings.passwordHint') }}</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-[9px] border border-line-200 bg-white px-4 py-2 text-[12.5px] font-semibold text-brand-600 hover:bg-mist-200 disabled:pointer-events-none disabled:opacity-50"
          :disabled="resetState === 'sending'"
          @click="sendPasswordEmail"
        >
          {{ resetState === 'sending' ? t('common.cargando') : t('settings.passwordButton') }}
        </button>
      </div>
      <p v-if="resetState === 'sent'" class="mt-2.5 rounded-lg bg-leaf-100 px-3 py-2 text-xs text-leaf-700">
        {{ t('settings.passwordSent', { email: auth.user?.email ?? '' }) }}
      </p>
      <p v-else-if="resetState === 'error'" class="mt-2.5 text-xs text-danger-600">
        {{ t('settings.passwordError') }}
      </p>
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
