<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

// Shared status chip. All estado values across entities live under the
// common.estados.* namespace; tone is derived from the value.
const props = defineProps<{ value: string }>()
const { t } = useI18n()

const TONES: Record<string, string> = {
  // Salida
  planificada: 'bg-stone-100 text-stone-600',
  ejecutada: 'bg-blue-100 text-blue-700',
  documentada: 'bg-emerald-100 text-emerald-700',
  // Entrada
  realizada: 'bg-blue-100 text-blue-700',
  donacion_recibida: 'bg-emerald-100 text-emerald-700',
  cerrada: 'bg-stone-200 text-stone-500',
  // Acta / certificado
  no: 'bg-stone-100 text-stone-500',
  no_aplica: 'bg-stone-100 text-stone-500',
  pendiente: 'bg-amber-100 text-amber-700',
  firmada: 'bg-emerald-100 text-emerald-700',
  enviado: 'bg-emerald-100 text-emerald-700',
}

const tone = computed(() => TONES[props.value] ?? 'bg-stone-100 text-stone-600')
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
    :class="tone"
  >
    {{ t(`common.estados.${value}`) }}
  </span>
</template>
