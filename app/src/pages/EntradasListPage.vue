<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '../components/BaseButton.vue'
import BaseSelect from '../components/BaseSelect.vue'
import EmptyState from '../components/EmptyState.vue'
import EstadoChip from '../components/EstadoChip.vue'
import { fetchAll } from '../lib/db'
import { formatMoney } from '../lib/money'
import { useCatalogsStore } from '../stores/catalogs'
import { useDirectoryStore } from '../stores/directory'
import { ESTADOS_ENTRADA, type Entrada, type EstadoEntrada } from '../types/models'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const catalogs = useCatalogsStore()
const directory = useDirectoryStore()

const entradas = ref<Entrada[]>([])
const loading = ref(true)

/* Pending-action deep link from the dashboard (?pending=…) */
type PendingFilter = 'certificado' | 'gracias' | 'donacion'
const fPending = ref<PendingFilter | null>(
  ['certificado', 'gracias', 'donacion'].includes(route.query.pending as string)
    ? (route.query.pending as PendingFilter)
    : null
)

function clearPending() {
  fPending.value = null
  router.replace({ query: {} })
}

/* Filters — client-side: internal tool, low volume */
const fEstado = ref<EstadoEntrada | null>(null)
const fArea = ref<string | null>(null)
const fLinea = ref<string | null>(null)
const fOrganizador = ref<string | null>(null)
const fContactoM4h = ref<string | null>(null)
const fDesde = ref<string | null>(null)
const fHasta = ref<string | null>(null)
const sortBy = ref<'fecha' | 'cantidad'>('fecha')

const filtered = computed(() => {
  let list = entradas.value
  if (fPending.value === 'certificado') list = list.filter((e) => e.certificado === 'pendiente')
  if (fPending.value === 'gracias') list = list.filter((e) => e.donaron && !e.graciasEnviado)
  if (fPending.value === 'donacion') list = list.filter((e) => e.estado === 'realizada' && !e.donaron)
  if (fEstado.value) list = list.filter((e) => e.estado === fEstado.value)
  if (fArea.value) list = list.filter((e) => e.areasDeAtencion.includes(fArea.value!))
  if (fLinea.value) list = list.filter((e) => e.lineasDeAccion.includes(fLinea.value!))
  if (fOrganizador.value) list = list.filter((e) => e.organizadorId === fOrganizador.value)
  if (fContactoM4h.value) list = list.filter((e) => e.contactoM4hId === fContactoM4h.value)
  if (fDesde.value) list = list.filter((e) => e.fechaInicio && e.fechaInicio >= fDesde.value!)
  if (fHasta.value) list = list.filter((e) => e.fechaInicio && e.fechaInicio <= fHasta.value!)
  return [...list].sort((a, b) =>
    sortBy.value === 'cantidad'
      ? (b.cantidadRecibidaMinor ?? 0) - (a.cantidadRecibidaMinor ?? 0)
      : (b.fechaInicio ?? '').localeCompare(a.fechaInicio ?? '')
  )
})

function fechas(e: Entrada): string {
  if (!e.fechaInicio) return '—'
  return e.fechaFin && e.fechaFin !== e.fechaInicio
    ? `${e.fechaInicio} → ${e.fechaFin}`
    : e.fechaInicio
}

onMounted(async () => {
  await Promise.all([catalogs.load(), directory.load()])
  entradas.value = await fetchAll<Entrada>('entrada')
  loading.value = false
})
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">{{ t('entradas.title') }}</h1>
      <RouterLink :to="{ name: 'entrada-new' }">
        <BaseButton>{{ t('entradas.new') }}</BaseButton>
      </RouterLink>
    </div>

    <!-- Active pending-action filter (from dashboard) -->
    <button
      v-if="fPending"
      type="button"
      class="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200"
      @click="clearPending"
    >
      {{ t(`entradas.pendingFilters.${fPending}`) }} ✕
    </button>

    <!-- Filters -->
    <div class="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <BaseSelect
        v-model="fEstado"
        allow-empty
        :label="t('common.estado')"
        :options="ESTADOS_ENTRADA.map((e) => ({ value: e, label: t(`common.estados.${e}`) }))"
      />
      <BaseSelect
        v-model="fArea"
        allow-empty
        :label="t('common.area')"
        :options="catalogs.areas.map((a) => ({ value: a.id, label: a.nombre }))"
      />
      <BaseSelect
        v-model="fLinea"
        allow-empty
        :label="t('common.linea')"
        :options="catalogs.lineas.map((l) => ({ value: l.id, label: l.nombre }))"
      />
      <BaseSelect
        v-model="fOrganizador"
        allow-empty
        :label="t('entradas.organizador')"
        :options="directory.organizations.map((o) => ({ value: o.id, label: o.name }))"
      />
      <BaseSelect
        v-model="fContactoM4h"
        allow-empty
        :label="t('common.contactoM4h')"
        :options="directory.users.map((u) => ({ value: u.id, label: u.name }))"
      />
      <label class="block">
        <span class="mb-1 block text-sm font-medium text-stone-600">{{ t('common.desde') }}</span>
        <input v-model="fDesde" type="date" class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium text-stone-600">{{ t('common.hasta') }}</span>
        <input v-model="fHasta" type="date" class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm" />
      </label>
      <BaseSelect
        v-model="sortBy"
        :label="t('common.ordenarPor')"
        :options="[
          { value: 'fecha', label: t('common.fecha') },
          { value: 'cantidad', label: t('entradas.cantidad') },
        ]"
      />
    </div>

    <p v-if="loading" class="text-sm text-stone-400">{{ t('common.cargando') }}</p>
    <EmptyState v-else-if="filtered.length === 0" :message="t('entradas.empty')" />

    <ul v-else class="space-y-2">
      <li v-for="e in filtered" :key="e.id">
        <RouterLink
          :to="{ name: 'entrada-detail', params: { id: e.id } }"
          class="block rounded-xl border border-stone-200 bg-white p-4 transition-shadow hover:shadow-md"
        >
          <!-- HERO SOURCE: name derived from record id — unique per page -->
          <div class="flex items-start justify-between gap-3" :style="{ viewTransitionName: 'entrada-' + e.id }">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ e.nombreIniciativa }}</p>
              <p class="mt-0.5 text-xs text-stone-400">
                {{ fechas(e) }} · {{ directory.orgName(e.organizadorId) }}
              </p>
              <div class="mt-1.5 flex flex-wrap items-center gap-1">
                <EstadoChip :value="e.certificado" />
                <span
                  v-if="!e.graciasEnviado && e.donaron"
                  class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700"
                >
                  {{ t('entradas.graciasPendiente') }}
                </span>
              </div>
            </div>
            <div class="flex flex-col items-end gap-1">
              <span class="text-sm font-bold whitespace-nowrap">
                {{ e.donaron ? formatMoney(e.cantidadRecibidaMinor, e.moneda) : '—' }}
              </span>
              <EstadoChip :value="e.estado" />
            </div>
          </div>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
