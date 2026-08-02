<script setup lang="ts">
// Per-record audit trail: who changed what, when, field-level diff.
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchHistory } from '../lib/db'
import type { AuditLog, EntityType } from '../types/models'

const props = defineProps<{ entityType: EntityType; entityId: string }>()
const { t, d } = useI18n()

const logs = ref<AuditLog[]>([])
const loading = ref(true)

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '∅'
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'boolean') return v ? t('common.si') : t('common.no')
  return String(v)
}

onMounted(async () => {
  logs.value = await fetchHistory(props.entityType, props.entityId)
  loading.value = false
})
</script>

<template>
  <section>
    <h3 class="mb-3 text-[13.5px] font-bold">{{ t('audit.title') }}</h3>
    <p v-if="loading" class="text-xs text-ink-400">{{ t('common.cargando') }}</p>
    <p v-else-if="logs.length === 0" class="text-xs text-ink-400">{{ t('audit.empty') }}</p>

    <ol v-else class="space-y-3">
      <li v-for="log in logs" :key="log.id" class="flex gap-2.5">
        <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
        <div class="min-w-0">
          <p class="text-[12.5px] leading-snug text-ink-600">
            <strong class="font-bold text-ink-900">{{ log.userName }}</strong>
            {{ t(`audit.actions.${log.action}`) }}
            <span v-if="log.timestamp" class="text-ink-400">
              · {{ d(log.timestamp.toDate(), 'short') }}
            </span>
          </p>
          <ul v-if="log.changes" class="mt-1 space-y-0.5">
            <li v-for="(pair, field) in log.changes" :key="field" class="text-[11px] text-ink-500">
              <code class="rounded bg-mist-100 px-1">{{ field }}</code>:
              <span class="text-danger-600/70 line-through">{{ fmt(pair[0]) }}</span>
              →
              <span class="text-leaf-700">{{ fmt(pair[1]) }}</span>
            </li>
          </ul>
        </div>
      </li>
    </ol>
  </section>
</template>
