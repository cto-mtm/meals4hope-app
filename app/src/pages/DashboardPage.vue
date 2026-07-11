<script setup lang="ts">
// The "visibility" piece: totals recibido vs entregado GROUPED BY CURRENCY
// (never summed across currencies — v1 has no conversion), breakdowns by
// área/línea, pending-action widgets, and the recent activity feed.
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import EmptyState from '../components/EmptyState.vue'
import { fetchAll, fetchRecentActivity } from '../lib/db'
import { formatMoney } from '../lib/money'
import { useCatalogsStore } from '../stores/catalogs'
import type { AuditLog, Currency, Entrada, Salida } from '../types/models'

const { t, d } = useI18n()
const catalogs = useCatalogsStore()

const entradas = ref<Entrada[]>([])
const salidas = ref<Salida[]>([])
const activity = ref<AuditLog[]>([])
const loading = ref(true)

/* ── Totals by currency ──────────────────────────────────────── */
type Totals = Partial<Record<Currency, number>>

const recibido = computed<Totals>(() => {
  const acc: Totals = {}
  for (const e of entradas.value) {
    if (e.donaron && e.cantidadRecibidaMinor != null) {
      acc[e.moneda] = (acc[e.moneda] ?? 0) + e.cantidadRecibidaMinor
    }
  }
  return acc
})

const entregado = computed<Totals>(() => {
  const acc: Totals = {}
  for (const s of salidas.value) {
    if (s.montoMinor != null) acc[s.moneda] = (acc[s.moneda] ?? 0) + s.montoMinor
  }
  return acc
})

/* ── Breakdown by área / línea (counts of records) ───────────── */
function breakdown(field: 'areasDeAtencion' | 'lineasDeAccion') {
  const counts = new Map<string, { entradas: number; salidas: number }>()
  for (const e of entradas.value)
    for (const id of e[field]) {
      const c = counts.get(id) ?? { entradas: 0, salidas: 0 }
      c.entradas++
      counts.set(id, c)
    }
  for (const s of salidas.value)
    for (const id of s[field]) {
      const c = counts.get(id) ?? { entradas: 0, salidas: 0 }
      c.salidas++
      counts.set(id, c)
    }
  return counts
}
const byArea = computed(() => breakdown('areasDeAtencion'))
const byLinea = computed(() => breakdown('lineasDeAccion'))

/* ── Pending-action widgets ──────────────────────────────────── */
const certificadosPendientes = computed(() =>
  entradas.value.filter((e) => e.certificado === 'pendiente')
)
const graciasPendientes = computed(() =>
  entradas.value.filter((e) => e.donaron && !e.graciasEnviado)
)
const actasSinFirmar = computed(() =>
  salidas.value.filter((s) => s.actaDeDonacion === 'pendiente')
)
const entradasSinDonacion = computed(() =>
  entradas.value.filter((e) => e.estado === 'realizada' && !e.donaron)
)

onMounted(async () => {
  await catalogs.load()
  ;[entradas.value, salidas.value, activity.value] = await Promise.all([
    fetchAll<Entrada>('entrada'),
    fetchAll<Salida>('salida'),
    fetchRecentActivity(10),
  ])
  loading.value = false
})
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-xl font-bold">{{ t('dashboard.title') }}</h1>

    <p v-if="loading" class="text-sm text-stone-400">{{ t('common.cargando') }}</p>

    <template v-else>
      <!-- Totals: recibido vs entregado, per currency -->
      <section class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <h2 class="text-sm font-semibold text-emerald-800">{{ t('dashboard.recibido') }}</h2>
          <p v-if="Object.keys(recibido).length === 0" class="mt-2 text-sm text-emerald-700/60">—</p>
          <p v-for="(minor, cur) in recibido" :key="cur" class="mt-1 text-2xl font-bold text-emerald-800">
            {{ formatMoney(minor ?? null, cur as Currency) }}
          </p>
        </div>
        <div class="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <h2 class="text-sm font-semibold text-blue-800">{{ t('dashboard.entregado') }}</h2>
          <p v-if="Object.keys(entregado).length === 0" class="mt-2 text-sm text-blue-700/60">—</p>
          <p v-for="(minor, cur) in entregado" :key="cur" class="mt-1 text-2xl font-bold text-blue-800">
            {{ formatMoney(minor ?? null, cur as Currency) }}
          </p>
        </div>
      </section>
      <p class="-mt-4 text-[11px] text-stone-400">{{ t('dashboard.currencyNote') }}</p>

      <!-- Pending actions -->
      <section>
        <h2 class="mb-2 font-semibold text-stone-700">{{ t('dashboard.pendingTitle') }}</h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <!-- Each widget deep-links to the list with its filter pre-applied -->
          <RouterLink
            v-for="widget in [
              { count: certificadosPendientes.length, label: t('dashboard.certificadosPendientes'), to: 'entradas', pending: 'certificado' },
              { count: graciasPendientes.length, label: t('dashboard.graciasPendientes'), to: 'entradas', pending: 'gracias' },
              { count: actasSinFirmar.length, label: t('dashboard.actasSinFirmar'), to: 'salidas', pending: 'acta' },
              { count: entradasSinDonacion.length, label: t('dashboard.entradasSinDonacion'), to: 'entradas', pending: 'donacion' },
            ]"
            :key="widget.label"
            :to="{ name: widget.to, query: { pending: widget.pending } }"
            class="rounded-xl border bg-white p-3 transition-shadow hover:shadow-md"
            :class="widget.count > 0 ? 'border-amber-300' : 'border-stone-200'"
          >
            <p class="text-2xl font-bold" :class="widget.count > 0 ? 'text-amber-600' : 'text-stone-300'">
              {{ widget.count }}
            </p>
            <p class="mt-0.5 text-xs text-stone-500">{{ widget.label }}</p>
          </RouterLink>
        </div>
      </section>

      <!-- Breakdowns -->
      <section class="grid gap-4 sm:grid-cols-2">
        <div
          v-for="block in [
            { title: t('dashboard.byArea'), counts: byArea, name: catalogs.areaName },
            { title: t('dashboard.byLinea'), counts: byLinea, name: catalogs.lineaName },
          ]"
          :key="block.title"
          class="rounded-xl border border-stone-200 bg-white p-4"
        >
          <h2 class="mb-2 text-sm font-semibold text-stone-700">{{ block.title }}</h2>
          <p v-if="block.counts.size === 0" class="text-xs text-stone-400">{{ t('common.sinDatos') }}</p>
          <ul v-else class="space-y-1.5">
            <li
              v-for="[id, c] in [...block.counts.entries()].sort((a, b) => b[1].entradas + b[1].salidas - a[1].entradas - a[1].salidas)"
              :key="id"
              class="flex items-center justify-between gap-2 text-sm"
            >
              <span class="min-w-0 truncate">{{ block.name(id) }}</span>
              <span class="whitespace-nowrap text-xs text-stone-400">
                {{ c.entradas }} {{ t('shell.nav.entradas').toLowerCase() }} · {{ c.salidas }} {{ t('shell.nav.salidas').toLowerCase() }}
              </span>
            </li>
          </ul>
        </div>
      </section>

      <!-- Recent activity -->
      <section>
        <h2 class="mb-2 font-semibold text-stone-700">{{ t('dashboard.activityTitle') }}</h2>
        <EmptyState v-if="activity.length === 0" :message="t('audit.empty')" />
        <ul v-else class="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
          <li v-for="log in activity" :key="log.id" class="flex items-center gap-2 px-4 py-2.5 text-sm">
            <span class="min-w-0 flex-1 truncate">
              <strong>{{ log.userName }}</strong>
              {{ t(`audit.actions.${log.action}`) }}
              {{ t(`audit.entities.${log.entityType}`) }}
              «{{ log.entityLabel }}»
            </span>
            <span v-if="log.timestamp" class="text-xs whitespace-nowrap text-stone-400">
              {{ d(log.timestamp.toDate(), 'short') }}
            </span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
