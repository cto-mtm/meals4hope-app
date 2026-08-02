<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { sendPasswordResetEmail } from 'firebase/auth'
import BaseButton from '../components/BaseButton.vue'
import BaseInput from '../components/BaseInput.vue'
import { auth as firebaseAuth } from '../lib/firebase'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref<string | null>(null)
const password = ref<string | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)

async function submit() {
  if (!email.value || !password.value) return
  loading.value = true
  error.value = null
  try {
    await auth.login(email.value, password.value)
    router.push((route.query.redirect as string) ?? { name: 'dashboard' })
  } catch (err) {
    error.value =
      err instanceof Error && err.message === 'inactive'
        ? t('login.inactive')
        : t('login.invalid')
  } finally {
    loading.value = false
  }
}

/* Google sign-in (members only — unprovisioned accounts are rejected). */
const googleLoading = ref(false)

async function googleLogin() {
  googleLoading.value = true
  error.value = null
  try {
    await auth.loginWithGoogle()
    router.push((route.query.redirect as string) ?? { name: 'dashboard' })
  } catch (err) {
    if (err instanceof Error && err.message === 'not-member') {
      error.value = t('login.notMember')
    } else if (!(err instanceof Error && err.message.includes('popup-closed'))) {
      error.value = t('login.invalid')
    }
  } finally {
    googleLoading.value = false
  }
}

/* Password reset. Against the Auth emulator no real email is sent — the
   reset link is printed in the emulator terminal / UI (:4000). */
const resetState = ref<'idle' | 'sent' | 'needEmail'>('idle')

async function resetPassword() {
  if (!email.value) {
    resetState.value = 'needEmail'
    return
  }
  try {
    await sendPasswordResetEmail(firebaseAuth, email.value)
  } catch {
    // Don't reveal whether the account exists.
  }
  resetState.value = 'sent'
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center bg-paper px-4">
    <div class="w-full max-w-sm rounded-card bg-white p-8 shadow-card">
      <h1 class="text-center text-2xl font-bold text-brand-600">Meals4Hope</h1>
      <p class="mt-1 text-center text-sm text-ink-500">{{ t('login.subtitle') }}</p>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <BaseInput v-model="email" :label="t('login.email')" type="email" required />
        <BaseInput v-model="password" :label="t('login.password')" type="password" required />
        <p v-if="error" class="text-sm text-danger-600">{{ error }}</p>
        <BaseButton type="submit" block :disabled="loading">
          {{ loading ? t('common.cargando') : t('login.submit') }}
        </BaseButton>
      </form>

      <div class="my-4 flex items-center gap-3">
        <span class="h-px flex-1 bg-line-200" />
        <span class="text-xs text-ink-400">{{ t('login.or') }}</span>
        <span class="h-px flex-1 bg-line-200" />
      </div>

      <button
        type="button"
        class="flex w-full items-center justify-center gap-2.5 rounded-[9px] border border-line-200 bg-white px-4 py-2.5 text-sm font-medium transition-colors hover:bg-mist-200 disabled:pointer-events-none disabled:opacity-50"
        :disabled="googleLoading"
        @click="googleLogin"
      >
        <svg class="h-4.5 w-4.5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.28 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.27a12 12 0 0 0 0 10.78l4.01-3.11z" />
          <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77z" />
        </svg>
        {{ googleLoading ? t('common.cargando') : t('login.google') }}
      </button>

      <div class="mt-3 text-center">
        <button
          type="button"
          class="text-xs font-medium text-brand-600 hover:underline"
          @click="resetPassword"
        >
          {{ t('login.forgot') }}
        </button>
        <p v-if="resetState === 'sent'" class="mt-1 text-xs text-leaf-700">
          {{ t('login.resetSent') }}
        </p>
        <p v-else-if="resetState === 'needEmail'" class="mt-1 text-xs text-sun-700">
          {{ t('login.resetNeedEmail') }}
        </p>
      </div>

      <p class="mt-4 text-center text-xs text-ink-400">{{ t('login.noSignup') }}</p>
    </div>
  </div>
</template>
