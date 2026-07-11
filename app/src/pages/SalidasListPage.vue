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
import { ESTADOS_SALIDA, type EstadoSalida, type Salida } from '../types/models'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const catalogs = useCatalogsStore()
const directory = useDirectoryStore()

const salidas = ref<Salida[]>([])
const loading = ref(true)

/* Pending-action deep link from the dashboard (?pending=acta) */
const fPending = ref<boolean>(route.query.pending === 'acta')

function clearPending() {
  fPending.value = false
  router.replace({ query: {} })
}

/* Filters — client-side: internal tool, low volume (see docs/architecture.md) */
const fEstado = ref<EstadoSalida | null>(null)
const fArea = ref<string | null>(null)
const fLinea = ref<string | null>(null)
const fBeneficiario = ref<string | null>(null)
const fContactoM4h = ref<string | null>(null)
const fDesde = ref<string | null>(null)
const fHasta = ref<string | null>(null)
const sortBy = ref<'fecha' | 'monto'>('fecha')

const filtered = computed(() => {
  let list = salidas.value
  if (fPending.value) list = list.filter((s) => s.actaDeDonacion === 'pendiente')
  if (fEstado.value) list = list.filter((s) => s.estado === fEstado.value)
  if (fArea.value) list = list.filter((s) => s.areasDeAtencion.includes(fArea.value!))
  if (fLinea.value) list = list.filter((s) => s.lineasDeAccion.includes(fLinea.value!))
  if (fBeneficiario.value) list = list.filter((s) => s.beneficiarioId === fBeneficiario.value)
  if (fContactoM4h.value) list = list.filter((s) => s.contactoM4hId === fContactoM4h.value)
  if (fDesde.value) list = list.filter((s) => s.fecha && s.fecha >= fDesde.value!)
  if (fHasta.value) list = list.filter((s) => s.fecha && s.fecha <= fHasta.value!)
  return [...list].sort((a, b) =>
    sortBy.value === 'monto'
      ? (b.montoMinor ?? 0) - (a.montoMinor ?? 0)
      : (b.fecha ?? '').localeCompare(a.fecha ?? '')
  )
})

onMounted(async () => {
  await Promise.all([catalogs.load(), directory.load()])
  salidas.value = await fetchAll<Salida>('salida')
  loading.value = false
})
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">{{ t('salidas.title') }}</h1>
      <RouterLink :to="{ name: 'salida-new' }">
        <BaseButton>{{ t('salidas.new') }}</BaseButton>
      </RouterLink>
    </div>

    <!-- Active pending-action filter (from dashboard) -->
    <button
      v-if="fPending"
      type="button"
      class="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200"
      @click="clearPending"
    >
      {{ t('salidas.pendingActa') }} ✕
    </button>

    <!-- Filters -->
    <div class="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <BaseSelect
        v-model="fEstado"
        allow-empty
        :label="t('common.estado')"
        :options="ESTADOS_SALIDA.map((e) => ({ value: e, label: t(`common.estados.${e}`) }))"
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
        v-model="fBeneficiario"
        allow-empty
        :label="t('salidas.beneficiario')"
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
          { value: 'monto', label: t('common.monto') },
        ]"
      />
    </div>

    <p v-if="loading" class="text-sm text-stone-400">{{ t('common.cargando') }}</p>
    <EmptyState v-else-if="filtered.length === 0" :message="t('salidas.empty')" />

    <ul v-else class="space-y-2">
      <li v-for="s in filtered" :key="s.id">
        <RouterLink
          :to="{ name: 'salida-detail', params: { id: s.id } }"
          class="block rounded-xl border border-stone-200 bg-white p-4 transition-shadow hover:shadow-md"
        >
          <!-- HERO SOURCE: view-transition-name must be unique per page,
               so it is ALWAYS derived from the record id (never static in
               a v-for). The detail page header carries the same name. -->
          <div class="flex items-start justify-between gap-3" :style="{ viewTransitionName: 'salida-' + s.id }">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ s.titulo }}</p>
              <p class="mt-0.5 text-xs text-stone-400">
                {{ s.fecha ?? '—' }} · {{ directory.orgName(s.beneficiarioId) }}
              </p>
              <div class="mt-1.5 flex flex-wrap gap-1">
                <span
                  v-for="areaId in s.areasDeAtencion"
                  :key="areaId"
                  class="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500"
                >
                  {{ catalogs.areaName(areaId) }}
                </span>
              </div>
            </div>
            <div class="flex flex-col items-end gap-1">
              <span class="text-sm font-bold whitespace-nowrap">{{ formatMoney(s.montoMinor, s.moneda) }}</span>
              <EstadoChip :value="s.estado" />
            </div>
          </div>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
