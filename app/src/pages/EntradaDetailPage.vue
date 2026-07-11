<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AttachmentsSection from '../components/AttachmentsSection.vue'
import BaseButton from '../components/BaseButton.vue'
import EstadoChip from '../components/EstadoChip.vue'
import FacturasSection from '../components/FacturasSection.vue'
import HistoryList from '../components/HistoryList.vue'
import { fetchById, softDeleteEntity } from '../lib/db'
import { formatMoney } from '../lib/money'
import { useCatalogsStore } from '../stores/catalogs'
import { useDirectoryStore } from '../stores/directory'
import type { Entrada } from '../types/models'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const catalogs = useCatalogsStore()
const directory = useDirectoryStore()

const id = route.params.id as string
const entrada = ref<Entrada | null>(null)
const loading = ref(true)

async function remove() {
  if (!entrada.value || !confirm(t('entradas.confirmDelete'))) return
  await softDeleteEntity('entrada', id, entrada.value.nombreIniciativa)
  router.push({ name: 'entradas' })
}

onMounted(async () => {
  await Promise.all([catalogs.load(), directory.load()])
  entrada.value = await fetchById<Entrada>('entrada', id)
  loading.value = false
})
</script>

<template>
  <p v-if="loading" class="text-sm text-stone-400">{{ t('common.cargando') }}</p>
  <p v-else-if="!entrada" class="text-sm text-stone-400">{{ t('common.noEncontrado') }}</p>

  <div v-else class="space-y-6">
    <!-- HERO TARGET: same view-transition-name as the list card -->
    <header
      class="rounded-2xl bg-brand-700 p-5 text-white"
      :style="{ viewTransitionName: 'entrada-' + entrada.id }"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-lg font-bold">{{ entrada.nombreIniciativa }}</h1>
          <p class="mt-1 text-sm text-white/70">
            {{ entrada.fechaInicio ?? '—' }}<span v-if="entrada.fechaFin && entrada.fechaFin !== entrada.fechaInicio"> → {{ entrada.fechaFin }}</span>
            · {{ directory.orgName(entrada.organizadorId) }}
          </p>
        </div>
        <p class="text-lg font-bold whitespace-nowrap">
          {{ entrada.donaron ? formatMoney(entrada.cantidadRecibidaMinor, entrada.moneda) : '—' }}
        </p>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <EstadoChip :value="entrada.estado" />
        <span class="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs">
          {{ t('entradas.certificado') }}: <EstadoChip :value="entrada.certificado" />
        </span>
      </div>
    </header>

    <div class="flex gap-2">
      <RouterLink :to="{ name: 'entrada-edit', params: { id: entrada.id } }">
        <BaseButton variant="secondary">{{ t('common.editar') }}</BaseButton>
      </RouterLink>
      <BaseButton variant="danger" @click="remove">{{ t('common.eliminar') }}</BaseButton>
    </div>

    <!-- Status chips -->
    <div class="flex flex-wrap gap-2">
      <span
        class="rounded-full px-3 py-1 text-xs font-medium"
        :class="entrada.donaron ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'"
      >
        {{ entrada.donaron ? t('entradas.donaronSi') : t('entradas.donaronNo') }}
      </span>
      <span
        class="rounded-full px-3 py-1 text-xs font-medium"
        :class="entrada.graciasEnviado ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
      >
        {{ entrada.graciasEnviado ? t('entradas.graciasEnviado') : t('entradas.graciasPendiente') }}
      </span>
      <span
        class="rounded-full px-3 py-1 text-xs font-medium"
        :class="entrada.promocionadoInstagram ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'"
      >
        {{ entrada.promocionadoInstagram ? t('entradas.igSi') : t('entradas.igNo') }}
      </span>
    </div>

    <!-- Fields -->
    <dl class="grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2">
      <div>
        <dt class="text-xs font-medium text-stone-400">{{ t('entradas.donde') }}</dt>
        <dd class="text-sm">{{ entrada.donde ?? '—' }}</dd>
      </div>
      <div>
        <dt class="text-xs font-medium text-stone-400">{{ t('common.lineas') }}</dt>
        <dd class="text-sm">
          {{ entrada.lineasDeAccion.map(catalogs.lineaName).join(', ') || '—' }}
        </dd>
      </div>
      <div>
        <dt class="text-xs font-medium text-stone-400">{{ t('common.areas') }}</dt>
        <dd class="text-sm">
          {{ entrada.areasDeAtencion.map(catalogs.areaName).join(', ') || '—' }}
        </dd>
      </div>
      <div>
        <dt class="text-xs font-medium text-stone-400">{{ t('common.contactoExterno') }}</dt>
        <dd class="text-sm">{{ directory.contactName(entrada.contactoExternoId) }}</dd>
      </div>
      <div>
        <dt class="text-xs font-medium text-stone-400">{{ t('common.contactoM4h') }}</dt>
        <dd class="text-sm">{{ directory.userName(entrada.contactoM4hId) }}</dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="text-xs font-medium text-stone-400">{{ t('common.descripcion') }}</dt>
        <dd class="text-sm whitespace-pre-wrap">{{ entrada.descripcion ?? '—' }}</dd>
      </div>
    </dl>

    <!-- Comprobantes of the received donation (optional for Entradas) -->
    <FacturasSection parent-type="entrada" :parent-id="entrada.id" />
    <AttachmentsSection parent-type="entrada" :parent-id="entrada.id" />
    <HistoryList entity-type="entrada" :entity-id="entrada.id" />
  </div>
</template>
