<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseButton from '../components/BaseButton.vue'
import BaseInput from '../components/BaseInput.vue'
import BaseModal from '../components/BaseModal.vue'
import BaseSelect from '../components/BaseSelect.vue'
import BaseTextarea from '../components/BaseTextarea.vue'
import EmptyState from '../components/EmptyState.vue'
import QuickCreateTeamMember from '../components/QuickCreateTeamMember.vue'
import { apiFetch } from '../lib/api'
import { useDirectoryStore } from '../stores/directory'
import type { Role, TeamMember, User } from '../types/models'

// Catalog management (Áreas/Líneas) left this page with the 2026 redesign —
// the catalogs and their store remain for the hidden Salidas module.

const { t } = useI18n()
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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

/* ── Equipo M4H (data records, no login) ─────────────────────── */
const editingMember = ref<TeamMember | null>(null)
const memberForm = ref({
  name: null as string | null,
  email: null as string | null,
  notes: null as string | null,
})
const savingMember = ref(false)

function openMemberEdit(m: TeamMember) {
  editingMember.value = m
  memberForm.value = { name: m.name, email: m.email, notes: m.notes }
}

async function saveMember() {
  if (!editingMember.value || !memberForm.value.name?.trim()) return
  savingMember.value = true
  try {
    await directory.updateTeamMember(editingMember.value, {
      name: memberForm.value.name.trim(),
      email: memberForm.value.email?.trim() || null,
      notes: memberForm.value.notes,
    })
    editingMember.value = null
  } finally {
    savingMember.value = false
  }
}

async function removeMember() {
  if (!editingMember.value || !confirm(t('team.confirmDelete'))) return
  savingMember.value = true
  try {
    await directory.deleteTeamMember(editingMember.value)
    editingMember.value = null
  } finally {
    savingMember.value = false
  }
}

onMounted(() => {
  loadUsers()
  directory.load()
})
</script>

<template>
  <div>
    <div class="mb-5 flex items-center justify-between">
      <h1 class="text-[22px] font-bold tracking-[-0.3px]">{{ t('admin.title') }}</h1>
      <RouterLink :to="{ name: 'activity' }" class="text-[12.5px] font-semibold text-brand-600">
        {{ t('admin.viewActivity') }}
      </RouterLink>
    </div>

    <!-- Members -->
    <section class="rounded-card bg-white shadow-card">
      <div class="flex items-center justify-between border-b border-line-100 px-5 py-4">
        <h2 class="text-[13.5px] font-bold">{{ t('admin.usersTitle') }}</h2>
        <button
          type="button"
          class="rounded-lg bg-brand-600 px-3.5 py-1.5 text-[12.5px] font-semibold whitespace-nowrap text-white hover:bg-brand-700"
          @click="showCreate = true"
        >
          + {{ t('admin.newUser') }}
        </button>
      </div>

      <p v-if="userError" class="px-5 pt-3 text-sm text-danger-600">{{ userError }}</p>
      <p v-if="loadingUsers" class="px-5 py-4 text-[13px] text-ink-400">{{ t('common.cargando') }}</p>

      <div v-else-if="users.length === 0" class="px-5 py-4">
        <EmptyState :message="t('admin.noUsers')" />
      </div>

      <!-- No overflow-hidden here: it would clip the kebab dropdown -->
      <div v-else>
        <div
          v-for="(u, i) in users"
          :key="u.id"
          class="flex flex-wrap items-center gap-3 px-5 py-3"
          :class="i < users.length - 1 ? 'border-b border-line-100/60' : ''"
        >
          <span
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
            :class="u.role === 'admin' ? 'bg-navy-900 text-white' : 'bg-leaf-100 text-leaf-700'"
          >
            {{ initials(u.name) }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[13.5px] font-bold" :class="u.activo ? '' : 'text-ink-400 line-through'">
              {{ u.name }}
            </p>
            <p class="truncate text-xs text-ink-400">{{ u.email }}</p>
          </div>
          <span
            class="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
            :class="u.role === 'admin' ? 'bg-brand-50 text-brand-600' : 'bg-mist-100 text-ink-600'"
          >
            {{ t(`admin.roles.${u.role}`) }}
          </span>

          <!-- Kebab actions menu -->
          <div class="relative">
            <button
              type="button"
              class="rounded-full p-1.5 text-ink-300 hover:bg-mist-100 hover:text-ink-600"
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
              class="absolute top-full right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-line-200 bg-white py-1 shadow-lg"
            >
              <button
                type="button"
                class="block w-full px-4 py-2.5 text-left text-sm hover:bg-mist-200"
                @click="toggleRole(u)"
              >
                {{ u.role === 'admin' ? t('admin.makeMember') : t('admin.makeAdmin') }}
              </button>
              <button
                type="button"
                class="block w-full px-4 py-2.5 text-left text-sm hover:bg-mist-200"
                :class="u.activo ? 'text-danger-600' : ''"
                @click="toggleActive(u)"
              >
                {{ u.activo ? t('admin.deactivate') : t('admin.activate') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Click-away catcher while a menu is open -->
      <div v-if="menuFor" class="fixed inset-0 z-10" @click="menuFor = null" />
    </section>

    <!-- Equipo M4H: gestoras de iniciativas (data, sin cuenta de acceso) -->
    <section class="mt-4 rounded-card bg-white shadow-card">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-line-100 px-5 py-4">
        <div>
          <h2 class="text-[13.5px] font-bold">{{ t('team.title') }}</h2>
          <p class="mt-0.5 text-xs text-ink-400">{{ t('team.subtitle') }}</p>
        </div>
        <QuickCreateTeamMember />
      </div>

      <div v-if="directory.teamMembers.length === 0" class="px-5 py-4">
        <EmptyState :message="t('team.empty')" />
      </div>

      <div v-else>
        <div
          v-for="(m, i) in directory.teamMembers"
          :key="m.id"
          class="flex items-center gap-3 px-5 py-3"
          :class="i < directory.teamMembers.length - 1 ? 'border-b border-line-100/60' : ''"
        >
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-leaf-100 text-[11px] font-bold text-leaf-700">
            {{ initials(m.name) }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[13.5px] font-bold">{{ m.name }}</p>
            <p class="truncate text-xs text-ink-400">{{ m.email ?? '—' }}</p>
          </div>
          <button
            type="button"
            class="text-[12.5px] font-semibold text-brand-600 hover:underline"
            @click="openMemberEdit(m)"
          >
            {{ t('common.editar') }}
          </button>
        </div>
      </div>
    </section>

    <!-- Edit team member modal -->
    <BaseModal :open="editingMember !== null" :title="t('team.editTitle')" @close="editingMember = null">
      <form class="space-y-4" @submit.prevent="saveMember">
        <BaseInput v-model="memberForm.name" :label="t('team.name')" required />
        <BaseInput v-model="memberForm.email" :label="t('team.email')" type="email" :hint="t('team.emailHint')" />
        <BaseTextarea v-model="memberForm.notes" :label="t('common.notas')" />
        <div class="flex gap-2">
          <BaseButton type="submit" :disabled="savingMember" class="flex-1">
            {{ savingMember ? t('common.cargando') : t('common.guardar') }}
          </BaseButton>
          <BaseButton variant="danger" :disabled="savingMember" @click="removeMember">
            {{ t('common.eliminar') }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>

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
        <p v-if="createError" class="text-sm text-danger-600">{{ createError }}</p>
        <BaseButton type="submit" block :disabled="creating">
          {{ creating ? t('common.cargando') : t('common.crear') }}
        </BaseButton>
      </form>
    </BaseModal>
  </div>
</template>
