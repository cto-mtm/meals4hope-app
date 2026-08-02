<script setup lang="ts">
// Global activity log (admin only): every create/update/soft-delete
// across all entities, most recent first.
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import EmptyState from '../components/EmptyState.vue'
import { fetchRecentActivity } from '../lib/db'
import type { AuditLog } from '../types/models'

const { t, d } = useI18n()
const logs = ref<AuditLog[]>([])
const loading = ref(true)

const ACTION_TONES: Record<string, string> = {
  created: 'bg-leaf-100 text-leaf-700',
  updated: 'bg-brand-50 text-brand-600',
  deleted: 'bg-danger-200/50 text-danger-600',
}

onMounted(async () => {
  logs.value = await fetchRecentActivity(100)
  loading.value = false
})
</script>

<template>
  <div>
    <h1 class="mb-5 text-[22px] font-bold tracking-[-0.3px]">{{ t('audit.globalTitle') }}</h1>

    <p v-if="loading" class="text-[13px] text-ink-400">{{ t('common.cargando') }}</p>
    <EmptyState v-else-if="logs.length === 0" :message="t('audit.empty')" />

    <ul v-else class="divide-y divide-line-100 overflow-hidden rounded-card bg-white shadow-card">
      <li v-for="log in logs" :key="log.id" class="px-5 py-3">
        <div class="flex flex-wrap items-center gap-2 text-[13px]">
          <strong class="font-bold">{{ log.userName }}</strong>
          <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="ACTION_TONES[log.action]">
            {{ t(`audit.actions.${log.action}`) }}
          </span>
          <span class="text-ink-500">
            {{ t(`audit.entities.${log.entityType}`) }} «{{ log.entityLabel }}»
          </span>
          <span v-if="log.timestamp" class="ml-auto text-xs text-ink-400">
            {{ d(log.timestamp.toDate(), 'short') }}
          </span>
        </div>
        <p v-if="log.changes" class="mt-1 text-xs text-ink-400">
          {{ Object.keys(log.changes).join(', ') }}
        </p>
      </li>
    </ul>
  </div>
</template>
