<script setup lang="ts">
// Per-partner history: "Bomberos UCV — 3 apoyos, $2,400 total".
// Totals are per-currency (never summed across currencies).
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
import { formatMoney } from '../lib/money'
import { useDirectoryStore } from '../stores/directory'
import {
  ORG_TYPES,
  type Contact,
  type Currency,
  type Entrada,
  type Organization,
  type OrgType,
  type Salida,
} from '../types/models'

const { t } = useI18n()
const route = useRoute()
const directory = useDirectoryStore()
const id = route.params.id as string

const org = ref<Organization | null>(null)
const salidas = ref<Salida[]>([])
const entradas = ref<Entrada[]>([])
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

const totalSalidas = computed<Totals>(() => {
  const acc: Totals = {}
  for (const s of salidas.value)
    if (s.montoMinor != null) acc[s.moneda] = (acc[s.moneda] ?? 0) + s.montoMinor
  return acc
})

const totalEntradas = computed<Totals>(() => {
  const acc: Totals = {}
  for (const e of entradas.value)
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

onMounted(async () => {
  const [o, allSalidas, allEntradas] = await Promise.all([
    fetchById<Organization>('organization', id),
    fetchAll<Salida>('salida'),
    fetchAll<Entrada>('entrada'),
    directory.load(),
  ])
  org.value = o
  salidas.value = allSalidas.filter((s) => s.beneficiarioId === id)
  entradas.value = allEntradas.filter((e) => e.organizadorId === id)
  loading.value = false
})
</script>

<template>
  <p v-if="loading" class="text-sm text-stone-400">{{ t('common.cargando') }}</p>
  <p v-else-if="!org" class="text-sm text-stone-400">{{ t('common.noEncontrado') }}</p>

  <div v-else class="space-y-6">
    <header class="rounded-2xl bg-brand-700 p-5 text-white">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-lg font-bold">{{ org.name }}</h1>
          <p class="mt-1 text-sm text-white/70">{{ t(`partners.types.${org.type}`) }}</p>
        </div>
        <button
          type="button"
          class="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25"
          @click="openEdit"
        >
          {{ t('common.editar') }}
        </button>
      </div>
      <p v-if="org.notes" class="mt-2 text-sm text-white/80">{{ org.notes }}</p>
      <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p class="text-white/60">{{ t('partners.apoyosRecibidos', { n: salidas.length }) }}</p>
          <p class="font-bold">{{ fmtTotals(totalSalidas) }}</p>
        </div>
        <div>
          <p class="text-white/60">{{ t('partners.iniciativas', { n: entradas.length }) }}</p>
          <p class="font-bold">{{ fmtTotals(totalEntradas) }}</p>
        </div>
      </div>
    </header>

    <!-- Linked contacts -->
    <section v-if="linkedContacts.length">
      <h2 class="mb-2 font-semibold text-stone-700">{{ t('contacts.title') }}</h2>
      <ul class="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
        <li v-for="c in linkedContacts" :key="c.id" class="flex items-center gap-3 px-4 py-3">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ c.name }}</p>
            <p class="truncate text-xs text-stone-400">{{ [c.phone, c.email].filter(Boolean).join(' · ') || '—' }}</p>
          </div>
          <button
            type="button"
            class="text-xs font-medium text-brand-700 hover:underline"
            @click="editingContact = c"
          >
            {{ t('common.editar') }}
          </button>
        </li>
      </ul>
    </section>

    <!-- Salidas to this partner -->
    <section v-if="salidas.length">
      <h2 class="mb-2 font-semibold text-stone-700">{{ t('partners.salidasTitle') }}</h2>
      <ul class="space-y-2">
        <li v-for="s in salidas" :key="s.id">
          <RouterLink
            :to="{ name: 'salida-detail', params: { id: s.id } }"
            class="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3 text-sm hover:shadow-md"
          >
            <span class="min-w-0 truncate">{{ s.titulo }} <span class="text-xs text-stone-400">{{ s.fecha ?? '' }}</span></span>
            <span class="flex items-center gap-2">
              <span class="font-semibold whitespace-nowrap">{{ formatMoney(s.montoMinor, s.moneda) }}</span>
              <EstadoChip :value="s.estado" />
            </span>
          </RouterLink>
        </li>
      </ul>
    </section>

    <!-- Entradas organized by this partner -->
    <section v-if="entradas.length">
      <h2 class="mb-2 font-semibold text-stone-700">{{ t('partners.entradasTitle') }}</h2>
      <ul class="space-y-2">
        <li v-for="e in entradas" :key="e.id">
          <RouterLink
            :to="{ name: 'entrada-detail', params: { id: e.id } }"
            class="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3 text-sm hover:shadow-md"
          >
            <span class="min-w-0 truncate">{{ e.nombreIniciativa }} <span class="text-xs text-stone-400">{{ e.fechaInicio ?? '' }}</span></span>
            <span class="flex items-center gap-2">
              <span class="font-semibold whitespace-nowrap">
                {{ e.donaron ? formatMoney(e.cantidadRecibidaMinor, e.moneda) : '—' }}
              </span>
              <EstadoChip :value="e.estado" />
            </span>
          </RouterLink>
        </li>
      </ul>
    </section>

    <EmptyState
      v-if="salidas.length === 0 && entradas.length === 0"
      :message="t('partners.noHistory')"
    />

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
