<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

// Shared status chip. All estado values across entities live under the
// common.estados.* namespace; tone is derived from the value.
const props = defineProps<{ value: string }>()
const { t } = useI18n()

const TONES: Record<string, string> = {
  // Iniciativa
  planificada: 'bg-brand-50 text-brand-600',
  realizada: 'bg-sun-100 text-sun-700',
  donacion_recibida: 'bg-leaf-100 text-leaf-700',
  cerrada: 'bg-mist-100 text-ink-600',
  // Salida (hidden for now, data model intact)
  ejecutada: 'bg-sun-100 text-sun-700',
  documentada: 'bg-leaf-100 text-leaf-700',
  // Acta / certificado
  no: 'bg-mist-100 text-ink-500',
  no_aplica: 'bg-mist-100 text-ink-500',
  pendiente: 'bg-sun-100 text-sun-700',
  firmada: 'bg-leaf-100 text-leaf-700',
  enviado: 'bg-leaf-100 text-leaf-700',
}

const tone = computed(() => TONES[props.value] ?? 'bg-mist-100 text-ink-600')
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap"
    :class="tone"
  >
    {{ t(`common.estados.${value}`) }}
  </span>
</template>
