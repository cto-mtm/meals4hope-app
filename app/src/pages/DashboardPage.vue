<script setup lang="ts">
// Redesigned Panel (2026 handoff): everything revolves around Iniciativas.
// Stat cards by estado, per-initiative follow-up chips, received totals BY
// CURRENCY (never summed across currencies), organizer breakdown, upcoming
// dates, and the recent activity feed. Salidas are hidden for now.
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import EstadoChip from '../components/EstadoChip.vue'
import { useAuthStore } from '../stores/auth'
import { fetchAll, fetchRecentActivity } from '../lib/db'
import { parseDateOnly } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { useDirectoryStore } from '../stores/directory'
import type { AuditLog, Currency, Entrada } from '../types/models'

const { t, d } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const directory = useDirectoryStore()

const iniciativas = ref<Entrada[]>([])
const activity = ref<AuditLog[]>([])
const loading = ref(true)

/* ── Header search: live suggestions + Enter → filtered list ─── */
const search = ref('')
const searchOpen = ref(false)

const searchMatches = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return []
  return iniciativas.value
    .filter(
      (e) =>
        e.nombreIniciativa.toLowerCase().includes(q) ||
        (e.donde ?? '').toLowerCase().includes(q) ||
        directory.orgName(e.organizadorId).toLowerCase().includes(q)
    )
    .slice(0, 6)
})

function goSearch() {
  searchOpen.value = false
  router.push({ name: 'iniciativas', query: search.value.trim() ? { q: search.value.trim() } : {} })
}

function goResult(id: string) {
  searchOpen.value = false
  router.push({ name: 'iniciativa-detail', params: { id } })
}

/* ── Stat cards ──────────────────────────────────────────────── */
const byEstado = computed(() => {
  const acc = { planificada: 0, realizada: 0, donacion_recibida: 0, cerrada: 0 }
  for (const e of iniciativas.value) acc[e.estado]++
  return acc
})
const abiertas = computed(() => iniciativas.value.length - byEstado.value.cerrada)

/* ── Follow-up chips per initiative ──────────────────────────── */
interface Chip {
  key: string
  label: string
  tone: 'amber' | 'blue'
}
function pendientes(e: Entrada): Chip[] {
  const chips: Chip[] = []
  if (e.estado === 'realizada' && !e.donaron)
    chips.push({ key: 'donacion', label: t('dashboard.chipSinDonacion'), tone: 'amber' })
  if (e.certificado === 'pendiente')
    chips.push({ key: 'certificado', label: t('dashboard.chipCertificado'), tone: 'amber' })
  if (e.donaron && !e.graciasEnviado)
    chips.push({ key: 'gracias', label: t('dashboard.chipGracias'), tone: 'amber' })
  // Closed initiatives are done — don't nag about missing planning data.
  if (e.estado !== 'cerrada') {
    if (!e.fechaInicio) chips.push({ key: 'fecha', label: t('dashboard.chipSinFecha'), tone: 'blue' })
    if (!e.organizadorId)
      chips.push({ key: 'organizador', label: t('dashboard.chipSinOrganizador'), tone: 'blue' })
  }
  return chips
}
const seguimiento = computed(() =>
  [...iniciativas.value]
    .map((e) => ({ e, chips: pendientes(e) }))
    .sort((a, b) => b.chips.length - a.chips.length)
)

/* ── Received totals by currency ─────────────────────────────── */
type Totals = Partial<Record<Currency, number>>
const recibido = computed<Totals>(() => {
  const acc: Totals = {}
  for (const e of iniciativas.value) {
    if (e.donaron && e.cantidadRecibidaMinor != null) {
      acc[e.moneda] = (acc[e.moneda] ?? 0) + e.cantidadRecibidaMinor
    }
  }
  return acc
})

/* ── By organizer ────────────────────────────────────────────── */
interface OrgRow {
  id: string | null
  name: string
  count: number
  totals: Totals
}
const porOrganizador = computed<OrgRow[]>(() => {
  const map = new Map<string | null, OrgRow>()
  for (const e of iniciativas.value) {
    const id = e.organizadorId
    const row = map.get(id) ?? {
      id,
      name: id ? directory.orgName(id) : t('dashboard.sinOrganizadorAsignado'),
      count: 0,
      totals: {},
    }
    row.count++
    if (e.donaron && e.cantidadRecibidaMinor != null) {
      row.totals[e.moneda] = (row.totals[e.moneda] ?? 0) + e.cantidadRecibidaMinor
    }
    map.set(id, row)
  }
  return [...map.values()].sort((a, b) => {
    const money = Object.keys(b.totals).length - Object.keys(a.totals).length
    return money !== 0 ? money : b.count - a.count
  })
})

function fmtTotals(totals: Totals): string {
  return Object.entries(totals)
    .map(([cur, minor]) => formatMoney(minor ?? null, cur as Currency))
    .join(' + ')
}

/* ── Upcoming dates ──────────────────────────────────────────── */
const proximas = computed(() => {
  const open = iniciativas.value.filter((e) => e.estado !== 'cerrada')
  const dated = open
    .filter((e) => e.fechaInicio)
    .sort((a, b) => a.fechaInicio!.localeCompare(b.fechaInicio!))
  const undated = open.filter((e) => !e.fechaInicio)
  return [...dated, ...undated].slice(0, 5)
})

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

onMounted(async () => {
  await directory.load()
  ;[iniciativas.value, activity.value] = await Promise.all([
    fetchAll<Entrada>('entrada'),
    fetchRecentActivity(8),
  ])
  loading.value = false
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-bold tracking-[-0.3px]">{{ t('dashboard.title') }}</h1>
        <p class="mt-0.5 text-[12.5px] text-ink-400">{{ d(new Date(), 'full') }}</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="relative hidden sm:block">
          <svg class="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input
            v-model="search"
            type="search"
            :placeholder="t('common.buscar')"
            class="w-52 rounded-[9px] border border-line-200 bg-white py-2 pr-3 pl-8.5 text-[13px] placeholder:text-ink-400 focus:border-brand-600 focus:outline-none"
            @focus="searchOpen = true"
            @input="searchOpen = true"
            @blur="searchOpen = false"
            @keydown.escape="searchOpen = false"
            @keydown.enter="goSearch"
          />
          <!-- Live results (mousedown.prevent: keep focus so blur ≠ click) -->
          <div
            v-if="searchOpen && search.trim()"
            class="absolute top-full right-0 z-30 mt-1 w-72 overflow-hidden rounded-[10px] border border-line-200 bg-white py-1 shadow-lg"
          >
            <p v-if="searchMatches.length === 0" class="px-3 py-2.5 text-[12.5px] text-ink-400">
              {{ t('common.sinResultados') }}
            </p>
            <button
              v-for="e in searchMatches"
              :key="e.id"
              type="button"
              class="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-mist-200"
              @mousedown.prevent="goResult(e.id)"
            >
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[12.5px] font-bold">{{ e.nombreIniciativa }}</span>
                <span class="block truncate text-[11px] text-ink-500">
                  {{ [e.organizadorId ? directory.orgName(e.organizadorId) : null, e.donde].filter(Boolean).join(' · ') || '—' }}
                </span>
              </span>
              <EstadoChip :value="e.estado" />
            </button>
          </div>
        </div>
        <RouterLink :to="{ name: 'iniciativa-new' }">
          <button type="button" class="rounded-[9px] bg-brand-600 px-4 py-2 text-[13px] font-semibold whitespace-nowrap text-white hover:bg-brand-700">
            + {{ t('iniciativas.new') }}
          </button>
        </RouterLink>
      </div>
    </div>

    <p v-if="loading" class="text-[13px] text-ink-400">{{ t('common.cargando') }}</p>

    <template v-else>
      <!-- Stat cards -->
      <section class="grid grid-cols-2 gap-3 md:grid-cols-[1.1fr_1fr_1fr_1fr_1fr]">
        <div class="rounded-card bg-navy-900 px-5 py-4 text-white">
          <p class="text-xs font-semibold text-white/65">{{ t('dashboard.statIniciativas') }}</p>
          <p class="mt-1 text-[38px] font-extrabold tracking-[-1px] tabular-nums">{{ iniciativas.length }}</p>
          <p class="text-[11.5px] text-white/55">
            {{ t('dashboard.statAbiertasCount', { n: abiertas }, abiertas) }} ·
            {{ t('dashboard.statCerradasCount', { n: byEstado.cerrada }, byEstado.cerrada) }}
          </p>
        </div>
        <div
          v-for="stat in [
            { label: t('dashboard.statPlanificadas'), count: byEstado.planificada, dot: 'bg-brand-400' },
            { label: t('dashboard.statRealizadas'), count: byEstado.realizada, dot: 'bg-sun-500' },
            { label: t('dashboard.statConDonacion'), count: byEstado.donacion_recibida, dot: 'bg-leaf-500' },
            { label: t('dashboard.statCerradas'), count: byEstado.cerrada, dot: 'bg-ink-400' },
          ]"
          :key="stat.label"
          class="rounded-card bg-white px-5 py-4 shadow-card"
        >
          <p class="flex items-center gap-1.5 text-xs font-semibold text-ink-600">
            <span class="h-2 w-2 rounded-full" :class="stat.dot" />
            {{ stat.label }}
          </p>
          <p class="mt-2 text-[30px] font-extrabold tracking-[-0.8px] tabular-nums">{{ stat.count }}</p>
        </div>
      </section>

      <!-- Follow-up + received -->
      <section class="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div class="rounded-card bg-white px-5 py-5 shadow-card">
          <div class="mb-2 flex items-baseline justify-between">
            <h2 class="text-[13.5px] font-bold">{{ t('dashboard.seguimientoTitle') }}</h2>
            <span class="text-xs text-ink-400">{{ t('dashboard.seguimientoSubtitle') }}</span>
          </div>
          <p v-if="seguimiento.length === 0" class="py-3 text-[12.5px] text-ink-400">{{ t('common.sinDatos') }}</p>
          <div v-else class="flex flex-col">
            <RouterLink
              v-for="({ e, chips }, i) in seguimiento"
              :key="e.id"
              :to="{ name: 'iniciativa-detail', params: { id: e.id } }"
              class="flex items-center gap-3 py-2.5"
              :class="[i < seguimiento.length - 1 ? 'border-b border-line-100' : '', chips.length === 0 ? 'opacity-55' : '']"
            >
              <span class="min-w-0 flex-1 truncate text-[13px] font-bold">{{ e.nombreIniciativa }}</span>
              <span class="flex flex-wrap justify-end gap-1.5">
                <template v-if="chips.length">
                  <span
                    v-for="chip in chips"
                    :key="chip.key"
                    class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    :class="chip.tone === 'amber' ? 'bg-sun-100 text-sun-700' : 'bg-brand-50 text-brand-600'"
                  >
                    {{ chip.label }}
                  </span>
                </template>
                <span v-else class="rounded-full bg-leaf-100 px-2.5 py-0.5 text-[11px] font-semibold text-leaf-700">
                  {{ t('dashboard.chipAlDia') }}
                </span>
              </span>
              <span v-if="chips.length" class="text-ink-300">→</span>
            </RouterLink>
          </div>
        </div>

        <div class="rounded-card bg-white px-5 py-5 shadow-card">
          <p class="flex items-center gap-2 text-[12.5px] font-semibold text-ink-600">
            <span class="flex h-6.5 w-6.5 items-center justify-center rounded-lg bg-leaf-100 text-leaf-700">
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </span>
            {{ t('dashboard.recibido') }}
          </p>
          <p v-if="Object.keys(recibido).length === 0" class="mt-3 text-[26px] font-extrabold text-ink-300">—</p>
          <p
            v-for="(minor, cur) in recibido"
            :key="cur"
            class="mt-3 text-[26px] font-extrabold tracking-[-0.6px] tabular-nums"
          >
            {{ formatMoney(minor ?? null, cur as Currency) }}
          </p>
          <p class="mt-1.5 text-[11.5px] leading-snug text-ink-400">{{ t('dashboard.currencyNote') }}</p>
        </div>
      </section>

      <!-- By organizer + upcoming dates -->
      <section class="mt-4 grid gap-4 lg:grid-cols-2">
        <div class="rounded-card bg-white px-5 py-5 shadow-card">
          <div class="mb-2 flex items-baseline justify-between">
            <h2 class="text-[13.5px] font-bold">{{ t('dashboard.porOrganizador') }}</h2>
            <RouterLink :to="{ name: 'partners' }" class="text-xs font-semibold text-brand-600">
              {{ t('dashboard.verAliados') }}
            </RouterLink>
          </div>
          <p v-if="porOrganizador.length === 0" class="py-3 text-[12.5px] text-ink-400">{{ t('common.sinDatos') }}</p>
          <div v-else class="flex flex-col text-[13px]">
            <div
              v-for="(row, i) in porOrganizador"
              :key="row.id ?? 'none'"
              class="flex items-center gap-3 py-2"
              :class="[i < porOrganizador.length - 1 ? 'border-b border-line-100' : '', row.id ? '' : 'opacity-60']"
            >
              <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] text-xs font-extrabold"
                :class="
                  !row.id
                    ? 'bg-mist-100 text-ink-400'
                    : Object.keys(row.totals).length
                      ? 'bg-leaf-100 text-leaf-700'
                      : 'bg-brand-50 text-brand-600'
                "
              >
                {{ row.id ? row.name[0]?.toUpperCase() : '?' }}
              </span>
              <span class="min-w-0 flex-1 truncate font-semibold" :class="row.id ? '' : 'text-ink-500'">
                {{ row.name }}
              </span>
              <span class="text-xs whitespace-nowrap text-ink-500">
                {{ t('dashboard.iniciativasCount', { n: row.count }, row.count) }}
              </span>
              <span v-if="Object.keys(row.totals).length" class="font-extrabold whitespace-nowrap text-leaf-700 tabular-nums">
                {{ fmtTotals(row.totals) }}
              </span>
              <span v-else class="text-ink-300">—</span>
            </div>
          </div>
        </div>

        <div class="rounded-card bg-white px-5 py-5 shadow-card">
          <h2 class="mb-2 text-[13.5px] font-bold">{{ t('dashboard.proximasFechas') }}</h2>
          <p v-if="proximas.length === 0" class="py-3 text-[12.5px] text-ink-400">{{ t('common.sinDatos') }}</p>
          <div v-else class="flex flex-col text-[13px]">
            <RouterLink
              v-for="(e, i) in proximas"
              :key="e.id"
              :to="{ name: 'iniciativa-detail', params: { id: e.id } }"
              class="flex items-center gap-3 py-2"
              :class="i < proximas.length - 1 ? 'border-b border-line-100' : ''"
            >
              <span
                v-if="e.fechaInicio"
                class="w-9.5 shrink-0 rounded-lg bg-brand-50 py-1 text-center"
              >
                <span class="block text-[9.5px] font-bold tracking-[0.5px] text-brand-600 uppercase">
                  {{ d(parseDateOnly(e.fechaInicio), 'month').replace('.', '') }}
                </span>
                <span class="block text-[15px] leading-tight font-extrabold text-brand-600">
                  {{ d(parseDateOnly(e.fechaInicio), 'dayOfMonth') }}
                </span>
              </span>
              <span v-else class="w-9.5 shrink-0 rounded-lg bg-mist-100 py-1 text-center">
                <span class="block text-[9.5px] font-bold tracking-[0.5px] text-ink-400">{{ t('dashboard.sinFechaLinea1') }}</span>
                <span class="block text-[11px] leading-snug font-extrabold text-ink-400">{{ t('dashboard.sinFechaLinea2') }}</span>
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate font-bold">{{ e.nombreIniciativa }}</span>
                <span class="block truncate text-[11.5px] text-ink-500">
                  {{ e.donde ?? (e.fechaInicio ? '—' : t('dashboard.pendienteAgendar')) }}
                </span>
              </span>
              <EstadoChip :value="e.estado" />
            </RouterLink>
          </div>
        </div>
      </section>

      <!-- Recent activity -->
      <section class="mt-4 rounded-card bg-white px-5 py-5 shadow-card">
        <div class="mb-2 flex items-baseline justify-between">
          <h2 class="text-[13.5px] font-bold">{{ t('dashboard.activityTitle') }}</h2>
          <RouterLink v-if="auth.isAdmin" :to="{ name: 'activity' }" class="text-xs font-semibold text-brand-600">
            {{ t('dashboard.verTodo') }}
          </RouterLink>
        </div>
        <p v-if="activity.length === 0" class="py-3 text-[12.5px] text-ink-400">{{ t('audit.empty') }}</p>
        <div v-else class="flex flex-col text-[13px]">
          <div
            v-for="(log, i) in activity"
            :key="log.id"
            class="flex items-center gap-3 py-2"
            :class="i < activity.length - 1 ? 'border-b border-line-100' : ''"
          >
            <span class="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10.5px] font-bold text-brand-600">
              {{ initials(log.userName) }}
            </span>
            <span class="min-w-0 flex-1 truncate">
              <strong class="font-bold">{{ log.userName }}</strong>
              {{ t(`audit.actions.${log.action}`) }}
              {{ t(`audit.entities.${log.entityType}`) }}
              «{{ log.entityLabel }}»
            </span>
            <span v-if="log.timestamp" class="text-[11.5px] whitespace-nowrap text-ink-400">
              {{ d(log.timestamp.toDate(), 'short') }}
            </span>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
