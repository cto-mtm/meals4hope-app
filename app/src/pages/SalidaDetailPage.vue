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
import type { Salida } from '../types/models'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const catalogs = useCatalogsStore()
const directory = useDirectoryStore()

const id = route.params.id as string
const salida = ref<Salida | null>(null)
const loading = ref(true)

async function remove() {
  if (!salida.value || !confirm(t('salidas.confirmDelete'))) return
  await softDeleteEntity('salida', id, salida.value.titulo)
  router.push({ name: 'salidas' })
}

onMounted(async () => {
  await Promise.all([catalogs.load(), directory.load()])
  salida.value = await fetchById<Salida>('salida', id)
  loading.value = false
})
</script>

<template>
  <p v-if="loading" class="text-sm text-stone-400">{{ t('common.cargando') }}</p>
  <p v-else-if="!salida" class="text-sm text-stone-400">{{ t('common.noEncontrado') }}</p>

  <div v-else class="space-y-6">
    <!-- HERO TARGET: same view-transition-name as the list card ('salida-<id>')
         — the browser morphs card → header automatically. -->
    <header
      class="rounded-2xl bg-brand-700 p-5 text-white"
      :style="{ viewTransitionName: 'salida-' + salida.id }"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-lg font-bold">{{ salida.titulo }}</h1>
          <p class="mt-1 text-sm text-white/70">
            {{ salida.fecha ?? '—' }} · {{ directory.orgName(salida.beneficiarioId) }}
          </p>
        </div>
        <p class="text-lg font-bold whitespace-nowrap">{{ formatMoney(salida.montoMinor, salida.moneda) }}</p>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <EstadoChip :value="salida.estado" />
        <!-- Acta status is prominent by design -->
        <span class="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs">
          {{ t('salidas.acta') }}: <EstadoChip :value="salida.actaDeDonacion" />
        </span>
      </div>
    </header>

    <div class="flex gap-2">
      <RouterLink :to="{ name: 'salida-edit', params: { id: salida.id } }">
        <BaseButton variant="secondary">{{ t('common.editar') }}</BaseButton>
      </RouterLink>
      <BaseButton variant="danger" @click="remove">{{ t('common.eliminar') }}</BaseButton>
    </div>

    <!-- Fields -->
    <dl class="grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2">
      <div>
        <dt class="text-xs font-medium text-stone-400">{{ t('common.lineas') }}</dt>
        <dd class="text-sm">
          {{ salida.lineasDeAccion.map(catalogs.lineaName).join(', ') || '—' }}
        </dd>
      </div>
      <div>
        <dt class="text-xs font-medium text-stone-400">{{ t('common.areas') }}</dt>
        <dd class="text-sm">
          {{ salida.areasDeAtencion.map(catalogs.areaName).join(', ') || '—' }}
        </dd>
      </div>
      <div>
        <dt class="text-xs font-medium text-stone-400">{{ t('common.contactoExterno') }}</dt>
        <dd class="text-sm">{{ directory.contactName(salida.contactoExternoId) }}</dd>
      </div>
      <div>
        <dt class="text-xs font-medium text-stone-400">{{ t('common.contactoM4h') }}</dt>
        <dd class="text-sm">{{ directory.userName(salida.contactoM4hId) }}</dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="text-xs font-medium text-stone-400">{{ t('common.descripcion') }}</dt>
        <dd class="text-sm whitespace-pre-wrap">{{ salida.descripcion ?? '—' }}</dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="text-xs font-medium text-stone-400">{{ t('salidas.impacto') }}</dt>
        <dd class="text-sm whitespace-pre-wrap">{{ salida.impacto ?? '—' }}</dd>
      </div>
    </dl>

    <FacturasSection parent-type="salida" :parent-id="salida.id" />
    <AttachmentsSection parent-type="salida" :parent-id="salida.id" />
    <HistoryList entity-type="salida" :entity-id="salida.id" />
  </div>
</template>
