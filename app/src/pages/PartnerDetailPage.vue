<script setup lang="ts">
// Per-partner history: linked contacts + the iniciativas they organized,
// with per-currency received totals (never summed across currencies).
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import BaseButton from '../components/BaseButton.vue'
import BaseInput from '../components/BaseInput.vue'
import BaseModal from '../components/BaseModal.vue'
import BaseSelect from '../components/BaseSelect.vue'
import BaseTextarea from '../components/BaseTextarea.vue'
import ContactEditModal from '../components/ContactEditModal.vue'
import EmptyState from '../components/EmptyState.vue'
import EstadoChip from '../components/EstadoChip.vue'
import { fetchAll, fetchById } from '../lib/db'
import { parseDateOnly } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { useDirectoryStore } from '../stores/directory'
import {
  ORG_TYPES,
  type Contact,
  type Currency,
  type Entrada,
  type Organization,
  type OrgType,
} from '../types/models'

const { t, d } = useI18n()
const route = useRoute()
const directory = useDirectoryStore()
const id = route.params.id as string

const org = ref<Organization | null>(null)
const iniciativas = ref<Entrada[]>([])
const loading = ref(true)

/* ── Edit partner ────────────────────────────────────────────── */
const showEdit = ref(false)
const editForm = ref<{ name: string | null; type: OrgType; notes: string | null }>({
  name: null,
  type: 'organizador',
  notes: null,
})
const saving = ref(false)

function openEdit() {
  if (!org.value) return
  editForm.value = { name: org.value.name, type: org.value.type, notes: org.value.notes }
  showEdit.value = true
}

async function saveEdit() {
  if (!org.value || !editForm.value.name?.trim()) return
  saving.value = true
  try {
    await directory.updateOrg(org.value, {
      name: editForm.value.name.trim(),
      type: editForm.value.type,
      notes: editForm.value.notes,
    })
    org.value = await fetchById<Organization>('organization', id)
    showEdit.value = false
  } finally {
    saving.value = false
  }
}

/* ── Linked contacts ─────────────────────────────────────────── */
const editingContact = ref<Contact | null>(null)
const linkedContacts = computed(() => directory.contacts.filter((c) => c.organizationId === id))

/* ── Totals ──────────────────────────────────────────────────── */
type Totals = Partial<Record<Currency, number>>

const totalRecibido = computed<Totals>(() => {
  const acc: Totals = {}
  for (const e of iniciativas.value)
    if (e.donaron && e.cantidadRecibidaMinor != null)
      acc[e.moneda] = (acc[e.moneda] ?? 0) + e.cantidadRecibidaMinor
  return acc
})

function fmtTotals(totals: Totals): string {
  const parts = Object.entries(totals).map(([cur, minor]) =>
    formatMoney(minor ?? null, cur as Currency)
  )
  return parts.length ? parts.join(' + ') : '—'
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

onMounted(async () => {
  const [o, allIniciativas] = await Promise.all([
    fetchById<Organization>('organization', id),
    fetchAll<Entrada>('entrada'),
    directory.load(),
  ])
  org.value = o
  iniciativas.value = allIniciativas.filter((e) => e.organizadorId === id)
  loading.value = false
})
</script>

<template>
  <p v-if="loading" class="text-[13px] text-ink-400">{{ t('common.cargando') }}</p>
  <p v-else-if="!org" class="text-[13px] text-ink-400">{{ t('common.noEncontrado') }}</p>

  <div v-else>
    <RouterLink :to="{ name: 'partners' }" class="mb-3.5 inline-block text-[12.5px] font-semibold text-brand-600">
      ← {{ t('partners.title') }}
    </RouterLink>

    <header class="rounded-card bg-white px-6 py-6 shadow-card">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex min-w-0 items-center gap-3.5">
          <span
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[15px] font-extrabold"
            :class="org.type === 'organizador' ? 'bg-leaf-100 text-leaf-700' : 'bg-brand-50 text-brand-600'"
          >
            {{ initials(org.name)[0] }}
          </span>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2.5">
              <h1 class="text-[21px] font-extrabold tracking-[-0.3px]">{{ org.name }}</h1>
              <span
                class="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                :class="org.type === 'organizador' ? 'bg-leaf-100 text-leaf-700' : 'bg-mist-100 text-ink-600'"
              >
                {{ t(`partners.types.${org.type}`) }}
              </span>
            </div>
            <p v-if="org.notes" class="mt-1 text-[13px] text-ink-500">{{ org.notes }}</p>
          </div>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-[9px] border border-line-200 bg-white px-3.5 py-2 text-[12.5px] font-semibold hover:bg-mist-200"
          @click="openEdit"
        >
          {{ t('common.editar') }}
        </button>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-3 border-t border-line-100 pt-4 text-[13px]">
        <div>
          <p class="text-[11px] font-bold tracking-[0.5px] text-ink-400 uppercase">
            {{ t('partners.iniciativasTitle') }}
          </p>
          <p class="mt-1 text-lg font-extrabold tabular-nums">{{ iniciativas.length }}</p>
        </div>
        <div>
          <p class="text-[11px] font-bold tracking-[0.5px] text-ink-400 uppercase">{{ t('dashboard.recibido') }}</p>
          <p class="mt-1 text-lg font-extrabold text-leaf-700 tabular-nums">{{ fmtTotals(totalRecibido) }}</p>
        </div>
      </div>
    </header>

    <!-- Linked contacts -->
    <section v-if="linkedContacts.length" class="mt-4">
      <h2 class="mb-2.5 text-[13.5px] font-bold">{{ t('contacts.title') }}</h2>
      <div class="overflow-hidden rounded-card bg-white shadow-card">
        <div
          v-for="(c, i) in linkedContacts"
          :key="c.id"
          class="flex items-center gap-3 px-4.5 py-3.5"
          :class="i < linkedContacts.length - 1 ? 'border-b border-line-100' : ''"
        >
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-600">
            {{ initials(c.name) }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[13.5px] font-bold">{{ c.name }}</p>
            <p class="truncate text-xs text-ink-400">{{ [c.metodoContacto, c.email].filter(Boolean).join(' · ') || '—' }}</p>
          </div>
          <button
            type="button"
            class="text-[12.5px] font-semibold text-brand-600 hover:underline"
            @click="editingContact = c"
          >
            {{ t('common.editar') }}
          </button>
        </div>
      </div>
    </section>

    <!-- Iniciativas organized by this partner -->
    <section v-if="iniciativas.length" class="mt-4">
      <h2 class="mb-2.5 text-[13.5px] font-bold">{{ t('partners.iniciativasTitle') }}</h2>
      <ul class="space-y-2.5">
        <li v-for="e in iniciativas" :key="e.id">
          <RouterLink
            :to="{ name: 'iniciativa-detail', params: { id: e.id } }"
            class="flex items-center justify-between gap-3 rounded-card bg-white px-4.5 py-3.5 text-[13px] shadow-card transition-shadow hover:shadow-card-hover"
          >
            <span class="min-w-0 truncate font-bold">
              {{ e.nombreIniciativa }}
              <span v-if="e.fechaInicio" class="ml-1 text-xs font-normal text-ink-400">
                {{ d(parseDateOnly(e.fechaInicio), 'day') }}
              </span>
            </span>
            <span class="flex shrink-0 items-center gap-2.5">
              <span v-if="e.donaron" class="font-extrabold whitespace-nowrap text-leaf-700 tabular-nums">
                {{ formatMoney(e.cantidadRecibidaMinor, e.moneda) }}
              </span>
              <span v-else class="text-ink-300">—</span>
              <EstadoChip :value="e.estado" />
            </span>
          </RouterLink>
        </li>
      </ul>
    </section>

    <EmptyState v-if="iniciativas.length === 0" class="mt-4" :message="t('partners.noHistory')" />

    <!-- Edit partner modal -->
    <BaseModal :open="showEdit" :title="t('partners.editTitle')" @close="showEdit = false">
      <form class="space-y-4" @submit.prevent="saveEdit">
        <BaseInput v-model="editForm.name" :label="t('partners.name')" required />
        <BaseSelect
          v-model="editForm.type"
          :label="t('partners.type')"
          :options="ORG_TYPES.map((v) => ({ value: v, label: t(`partners.types.${v}`) }))"
        />
        <BaseTextarea v-model="editForm.notes" :label="t('common.notas')" />
        <BaseButton type="submit" block :disabled="saving">
          {{ saving ? t('common.cargando') : t('common.guardar') }}
        </BaseButton>
      </form>
    </BaseModal>

    <ContactEditModal :contact="editingContact" @close="editingContact = null" />
  </div>
</template>
