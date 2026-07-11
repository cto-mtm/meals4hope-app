<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseButton from '../components/BaseButton.vue'
import BaseInput from '../components/BaseInput.vue'
import BaseModal from '../components/BaseModal.vue'
import BaseSelect from '../components/BaseSelect.vue'
import EmptyState from '../components/EmptyState.vue'
import { apiFetch } from '../lib/api'
import { useCatalogsStore } from '../stores/catalogs'
import { useDirectoryStore } from '../stores/directory'
import type { Role, User } from '../types/models'

const { t } = useI18n()
const catalogs = useCatalogsStore()
const directory = useDirectoryStore()

/* ── Users ───────────────────────────────────────────────────── */
const users = ref<User[]>([])
const loadingUsers = ref(false)
const userError = ref<string | null>(null)

async function loadUsers() {
  loadingUsers.value = true
  userError.value = null // clear stale errors from previous attempts
  const res = await apiFetch<{ users: User[] }>('/users')
  if (res.ok) users.value = res.data.users
  else userError.value = res.error
  loadingUsers.value = false
}

/* Row actions live in a kebab (⋮) menu; one open at a time. */
const menuFor = ref<string | null>(null)

const showCreate = ref(false)
interface NewUserForm {
  name: string | null
  email: string | null
  password: string | null
  role: Role
}
const newUser = ref<NewUserForm>({ name: null, email: null, password: null, role: 'member' })
const creating = ref(false)
const createError = ref<string | null>(null)

async function createUser() {
  if (!newUser.value.name || !newUser.value.email) return
  // Empty password = Google-only member; strip it from the payload.
  if (!newUser.value.password) newUser.value.password = null
  creating.value = true
  createError.value = null
  const res = await apiFetch<{ success: boolean }>('/users', {
    method: 'POST',
    body: JSON.stringify({ ...newUser.value, password: newUser.value.password ?? undefined }),
  })
  creating.value = false
  if (!res.ok) {
    createError.value = res.error
    return
  }
  showCreate.value = false
  newUser.value = { name: null, email: null, password: null, role: 'member' }
  await Promise.all([loadUsers(), directory.load(true)])
}

async function toggleActive(u: User) {
  menuFor.value = null
  const res = await apiFetch(`/users/${u.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ activo: !u.activo }),
  })
  await loadUsers()
  if (!res.ok) userError.value = res.error
}

async function toggleRole(u: User) {
  menuFor.value = null
  const res = await apiFetch(`/users/${u.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ role: u.role === 'admin' ? 'member' : 'admin' }),
  })
  await loadUsers()
  if (!res.ok) userError.value = res.error
}

/* ── Catalogs ────────────────────────────────────────────────── */
const newArea = ref<string | null>(null)
const newLinea = ref<string | null>(null)

async function addCatalog(type: 'area' | 'linea') {
  const model = type === 'area' ? newArea : newLinea
  if (!model.value?.trim()) return
  await catalogs.addItem(type, model.value.trim())
  model.value = null
}

onMounted(() => {
  loadUsers()
  catalogs.load()
})
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold">{{ t('admin.title') }}</h1>
      <RouterLink :to="{ name: 'activity' }" class="text-sm font-medium text-brand-700 hover:underline">
        {{ t('admin.viewActivity') }}
      </RouterLink>
    </div>

    <!-- Users -->
    <section>
      <div class="mb-3 flex items-center justify-between">
        <h2 class="font-semibold text-stone-700">{{ t('admin.usersTitle') }}</h2>
        <BaseButton @click="showCreate = true">{{ t('admin.newUser') }}</BaseButton>
      </div>

      <p v-if="userError" class="mb-2 text-sm text-red-600">{{ userError }}</p>
      <p v-if="loadingUsers" class="text-sm text-stone-400">{{ t('common.cargando') }}</p>

      <EmptyState v-else-if="users.length === 0" :message="t('admin.noUsers')" />

      <!-- No overflow-hidden here: it would clip the kebab dropdown -->
      <ul v-else class="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
        <li v-for="u in users" :key="u.id" class="flex flex-wrap items-center gap-2 px-4 py-3">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium" :class="u.activo ? '' : 'text-stone-400 line-through'">
              {{ u.name }}
            </p>
            <p class="truncate text-xs text-stone-400">{{ u.email }}</p>
          </div>
          <span
            class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            :class="u.role === 'admin' ? 'bg-brand-100 text-brand-800' : 'bg-stone-100 text-stone-600'"
          >
            {{ t(`admin.roles.${u.role}`) }}
          </span>

          <!-- Kebab actions menu -->
          <div class="relative">
            <button
              type="button"
              class="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              :aria-label="t('admin.userActions')"
              :aria-expanded="menuFor === u.id"
              @click="menuFor = menuFor === u.id ? null : u.id"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="12" cy="19" r="1.6" />
              </svg>
            </button>

            <div
              v-if="menuFor === u.id"
              class="absolute top-full right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
            >
              <button
                type="button"
                class="block w-full px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-50"
                @click="toggleRole(u)"
              >
                {{ u.role === 'admin' ? t('admin.makeMember') : t('admin.makeAdmin') }}
              </button>
              <button
                type="button"
                class="block w-full px-4 py-2.5 text-left text-sm hover:bg-stone-50"
                :class="u.activo ? 'text-red-600' : 'text-stone-700'"
                @click="toggleActive(u)"
              >
                {{ u.activo ? t('admin.deactivate') : t('admin.activate') }}
              </button>
            </div>
          </div>
        </li>
      </ul>

      <!-- Click-away catcher while a menu is open -->
      <div v-if="menuFor" class="fixed inset-0 z-10" @click="menuFor = null" />
    </section>

    <!-- Catalogs -->
    <section class="grid gap-6 sm:grid-cols-2">
      <div v-for="cat in ([{ type: 'area', title: t('admin.areasTitle'), items: catalogs.areas }, { type: 'linea', title: t('admin.lineasTitle'), items: catalogs.lineas }] as const)" :key="cat.type">
        <h2 class="mb-3 font-semibold text-stone-700">{{ cat.title }}</h2>
        <ul class="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
          <li v-for="item in cat.items" :key="item.id" class="flex items-center gap-2 px-4 py-2.5">
            <span class="flex-1 text-sm" :class="item.activo ? '' : 'text-stone-400 line-through'">
              {{ item.nombre }}
            </span>
            <button
              type="button"
              class="text-xs font-medium"
              :class="item.activo ? 'text-red-500 hover:text-red-700' : 'text-brand-700 hover:text-brand-800'"
              @click="catalogs.toggleItem(cat.type, item)"
            >
              {{ item.activo ? t('admin.catalogOff') : t('admin.catalogOn') }}
            </button>
          </li>
        </ul>
        <form class="mt-2 flex gap-2" @submit.prevent="addCatalog(cat.type)">
          <div class="flex-1">
            <BaseInput
              :model-value="cat.type === 'area' ? newArea : newLinea"
              :placeholder="t('admin.newItemPlaceholder')"
              @update:model-value="(v: string | null) => (cat.type === 'area' ? (newArea = v) : (newLinea = v))"
            />
          </div>
          <BaseButton type="submit" variant="secondary">{{ t('common.agregar') }}</BaseButton>
        </form>
      </div>
    </section>

    <!-- Create user modal -->
    <BaseModal :open="showCreate" :title="t('admin.newUser')" @close="showCreate = false">
      <form class="space-y-4" @submit.prevent="createUser">
        <BaseInput v-model="newUser.name" :label="t('admin.form.name')" required />
        <BaseInput v-model="newUser.email" :label="t('admin.form.email')" type="email" required />
        <BaseInput
          v-model="newUser.password"
          :label="t('admin.form.password')"
          type="password"
          :hint="t('admin.form.passwordHint')"
        />
        <BaseSelect
          v-model="newUser.role"
          :label="t('admin.form.role')"
          :options="[
            { value: 'member', label: t('admin.roles.member') },
            { value: 'admin', label: t('admin.roles.admin') },
          ]"
        />
        <p v-if="createError" class="text-sm text-red-600">{{ createError }}</p>
        <BaseButton type="submit" block :disabled="creating">
          {{ creating ? t('common.cargando') : t('common.crear') }}
        </BaseButton>
      </form>
    </BaseModal>
  </div>
</template>
