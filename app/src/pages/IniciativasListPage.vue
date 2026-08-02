<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '../components/EmptyState.vue'
import EstadoChip from '../components/EstadoChip.vue'
import SearchSelect from '../components/SearchSelect.vue'
import { fetchAll } from '../lib/db'
import { parseDateOnly } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { useDirectoryStore } from '../stores/directory'
import { ESTADOS_ENTRADA, type Entrada, type EstadoEntrada } from '../types/models'

const { t, d } = useI18n()
const route = useRoute()
const router = useRouter()
const directory = useDirectoryStore()

const iniciativas = ref<Entrada[]>([])
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
const fSearch = ref<string>((route.query.q as string) ?? '')
const fEstado = ref<EstadoEntrada | null>(null)
const fOrganizador = ref<string | null>(null)
const fContactoM4h = ref<string | null>(null)
const sortBy = ref<'fecha' | 'nombre' | 'monto'>('fecha')
const vista = ref<'cards' | 'tabla'>('cards')

const filtered = computed(() => {
  let list = iniciativas.value
  if (fPending.value === 'certificado') list = list.filter((e) => e.certificado === 'pendiente')
  if (fPending.value === 'gracias') list = list.filter((e) => e.donaron && !e.graciasEnviado)
  if (fPending.value === 'donacion') list = list.filter((e) => e.estado === 'realizada' && !e.donaron)
  const q = fSearch.value.toLowerCase().trim()
  if (q) {
    list = list.filter(
      (e) =>
        e.nombreIniciativa.toLowerCase().includes(q) ||
        (e.donde ?? '').toLowerCase().includes(q) ||
        directory.orgName(e.organizadorId).toLowerCase().includes(q)
    )
  }
  if (fEstado.value) list = list.filter((e) => e.estado === fEstado.value)
  if (fOrganizador.value) list = list.filter((e) => e.organizadorId === fOrganizador.value)
  if (fContactoM4h.value) list = list.filter((e) => e.contactoM4hId === fContactoM4h.value)
  return [...list].sort((a, b) => {
    if (sortBy.value === 'nombre') return a.nombreIniciativa.localeCompare(b.nombreIniciativa)
    if (sortBy.value === 'monto')
      return (b.cantidadRecibidaMinor ?? 0) - (a.cantidadRecibidaMinor ?? 0)
    return (b.fechaInicio ?? '').localeCompare(a.fechaInicio ?? '')
  })
})

/** "10 jul 2026", or "15 – 17 jun 2026" for ranges. */
function fechas(e: Entrada): string {
  if (!e.fechaInicio) return t('iniciativas.sinFecha')
  const inicio = parseDateOnly(e.fechaInicio)
  if (!e.fechaFin || e.fechaFin === e.fechaInicio) return d(inicio, 'day')
  const fin = parseDateOnly(e.fechaFin)
  const sameMonth =
    inicio.getMonth() === fin.getMonth() && inicio.getFullYear() === fin.getFullYear()
  return sameMonth
    ? `${d(inicio, 'dayOfMonth')} – ${d(fin, 'day')}`
    : `${d(inicio, 'day')} – ${d(fin, 'day')}`
}

function metaLine(e: Entrada): string {
  return [
    fechas(e),
    e.organizadorId ? directory.orgName(e.organizadorId) : t('iniciativas.sinOrganizador'),
    e.donde,
  ]
    .filter(Boolean)
    .join(' · ')
}

onMounted(async () => {
  await directory.load()
  iniciativas.value = await fetchAll<Entrada>('entrada')
  loading.value = false
})
</script>

<template>
  <div>
    <div class="mb-5 flex items-center justify-between">
      <h1 class="text-[22px] font-bold tracking-[-0.3px]">{{ t('iniciativas.title') }}</h1>
      <RouterLink :to="{ name: 'iniciativa-new' }">
        <button type="button" class="rounded-[9px] bg-brand-600 px-4 py-2 text-[13px] font-semibold whitespace-nowrap text-white hover:bg-brand-700">
          + {{ t('iniciativas.new') }}
        </button>
      </RouterLink>
    </div>

    <!-- Active pending-action filter (from dashboard) -->
    <button
      v-if="fPending"
      type="button"
      class="mb-3 inline-flex items-center gap-1.5 rounded-full bg-sun-100 px-3 py-1.5 text-xs font-semibold text-sun-700 hover:bg-sun-100/70"
      @click="clearPending"
    >
      {{ t(`iniciativas.pendingFilters.${fPending}`) }} ✕
    </button>

    <!-- Filter bar -->
    <div class="mb-4 flex flex-wrap items-center gap-2.5 rounded-card bg-white px-4 py-3.5 shadow-card">
      <div class="relative min-w-[180px] flex-1">
        <svg class="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input
          v-model="fSearch"
          type="search"
          :placeholder="t('iniciativas.searchPlaceholder')"
          class="w-full rounded-[9px] border border-line-200 py-1.5 pr-3 pl-8.5 text-[12.5px] placeholder:text-ink-400 focus:border-brand-600 focus:outline-none"
        />
      </div>
      <select v-model="fEstado" class="rounded-[9px] border border-line-200 bg-white px-2.5 py-1.5 text-[12.5px] text-ink-600 focus:border-brand-600 focus:outline-none">
        <option :value="null">{{ t('common.estado') }}</option>
        <option v-for="e in ESTADOS_ENTRADA" :key="e" :value="e">{{ t(`common.estados.${e}`) }}</option>
      </select>
      <SearchSelect
        v-model="fOrganizador"
        class="w-44"
        :placeholder="t('iniciativas.organizadorShort')"
        :options="directory.organizations.map((o) => ({ value: o.id, label: o.name }))"
      />
      <SearchSelect
        v-model="fContactoM4h"
        class="w-44"
        :placeholder="t('common.contactoM4h')"
        :options="directory.teamMembers.map((m) => ({ value: m.id, label: m.name }))"
      />
      <select v-model="sortBy" class="rounded-[9px] border border-line-200 bg-white px-2.5 py-1.5 text-[12.5px] text-ink-600 focus:border-brand-600 focus:outline-none">
        <option value="fecha">{{ t('iniciativas.ordenar', { campo: t('iniciativas.ordenarFecha') }) }}</option>
        <option value="nombre">{{ t('iniciativas.ordenar', { campo: t('iniciativas.ordenarNombre') }) }}</option>
        <option value="monto">{{ t('iniciativas.ordenar', { campo: t('iniciativas.ordenarMonto') }) }}</option>
      </select>
      <!-- Cards / table toggle -->
      <div class="ml-auto inline-flex rounded-[9px] bg-mist-100 p-0.5">
        <button
          type="button"
          class="rounded-lg px-2.5 py-1 text-[12px] font-semibold"
          :class="vista === 'cards' ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500'"
          @click="vista = 'cards'"
        >
          {{ t('iniciativas.vistaCards') }}
        </button>
        <button
          type="button"
          class="rounded-lg px-2.5 py-1 text-[12px] font-semibold"
          :class="vista === 'tabla' ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500'"
          @click="vista = 'tabla'"
        >
          {{ t('iniciativas.vistaTabla') }}
        </button>
      </div>
    </div>

    <p v-if="loading" class="text-[13px] text-ink-400">{{ t('common.cargando') }}</p>
    <EmptyState v-else-if="filtered.length === 0" :message="t('iniciativas.empty')" />

    <!-- Cards view -->
    <ul v-else-if="vista === 'cards'" class="space-y-2.5">
      <li v-for="e in filtered" :key="e.id">
        <RouterLink
          :to="{ name: 'iniciativa-detail', params: { id: e.id } }"
          class="flex items-center gap-4 rounded-card bg-white px-5 py-4 shadow-card transition-shadow hover:shadow-card-hover"
        >
          <!-- HERO SOURCE: name derived from record id — unique per page -->
          <div class="min-w-0 flex-1" :style="{ viewTransitionName: 'iniciativa-' + e.id }">
            <div class="flex flex-wrap items-center gap-2.5">
              <span class="text-[14.5px] font-bold">{{ e.nombreIniciativa }}</span>
              <EstadoChip :value="e.estado" />
              <span
                v-if="e.certificado === 'pendiente'"
                class="rounded-full bg-sun-100 px-2.5 py-0.5 text-[11px] font-semibold text-sun-700"
              >
                {{ t('iniciativas.certificadoPendiente') }}
              </span>
              <span
                v-else-if="e.certificado === 'enviado'"
                class="rounded-full bg-leaf-100 px-2.5 py-0.5 text-[11px] font-semibold text-leaf-700"
              >
                {{ t('iniciativas.certificadoEnviado') }}
              </span>
            </div>
            <p class="mt-1 truncate text-[12.5px] text-ink-500">{{ metaLine(e) }}</p>
          </div>
          <div class="shrink-0 text-right">
            <p v-if="e.donaron" class="text-[15px] font-extrabold text-leaf-700 tabular-nums">
              {{ formatMoney(e.cantidadRecibidaMinor, e.moneda) }}
            </p>
            <p v-else class="text-[15px] font-extrabold text-ink-400">—</p>
            <p class="text-[11px]" :class="e.donaron ? 'text-ink-400' : 'text-ink-300'">
              {{ e.donaron ? t('iniciativas.donacionRecibidaSub') : t('iniciativas.sinDonacionSub') }}
            </p>
          </div>
        </RouterLink>
      </li>
    </ul>

    <!-- Table view -->
    <div v-else class="overflow-x-auto rounded-card bg-white shadow-card">
      <div class="min-w-[640px]">
        <div class="grid grid-cols-[2fr_1.2fr_1.4fr_1fr_1fr_0.8fr] gap-3 border-b border-mist-100 px-5 py-2.5 text-[11px] font-bold tracking-[0.5px] text-ink-400 uppercase">
          <span>{{ t('iniciativas.thIniciativa') }}</span>
          <span>{{ t('iniciativas.thFecha') }}</span>
          <span>{{ t('iniciativas.thOrganizador') }}</span>
          <span>{{ t('iniciativas.thEstado') }}</span>
          <span>{{ t('iniciativas.thCertificado') }}</span>
          <span class="text-right">{{ t('iniciativas.thMonto') }}</span>
        </div>
        <RouterLink
          v-for="(e, i) in filtered"
          :key="e.id"
          :to="{ name: 'iniciativa-detail', params: { id: e.id } }"
          class="grid grid-cols-[2fr_1.2fr_1.4fr_1fr_1fr_0.8fr] items-center gap-3 px-5 py-3 text-[13px] hover:bg-mist-200"
          :class="i < filtered.length - 1 ? 'border-b border-line-100/60' : ''"
        >
          <span class="truncate font-bold">{{ e.nombreIniciativa }}</span>
          <span class="truncate text-[12.5px]" :class="e.fechaInicio ? 'text-ink-500' : 'text-ink-300'">
            {{ e.fechaInicio ? fechas(e) : '—' }}
          </span>
          <span class="truncate text-[12.5px]" :class="e.organizadorId ? 'text-ink-600' : 'text-ink-300'">
            {{ e.organizadorId ? directory.orgName(e.organizadorId) : '—' }}
          </span>
          <span><EstadoChip :value="e.estado" /></span>
          <span
            class="text-[12px] font-semibold"
            :class="
              e.certificado === 'pendiente'
                ? 'text-sun-700'
                : e.certificado === 'enviado'
                  ? 'text-leaf-700'
                  : 'text-ink-400'
            "
          >
            {{ t(`common.estados.${e.certificado}`) }}
          </span>
          <span class="text-right">
            <template v-if="e.donaron">
              <span class="font-extrabold text-leaf-700 tabular-nums">{{ formatMoney(e.cantidadRecibidaMinor, e.moneda) }}</span>
            </template>
            <span v-else class="text-ink-400">—</span>
          </span>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
