<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
    type?: 'button' | 'submit'
    disabled?: boolean
    block?: boolean
  }>(),
  { variant: 'primary', type: 'button', disabled: false, block: false }
)

const classes = computed(() => {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-[9px] px-4 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none'
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-700',
    secondary: 'bg-white text-ink-900 border border-line-200 hover:bg-mist-200',
    danger: 'bg-white text-danger-600 border border-danger-200 hover:bg-red-50',
    ghost: 'text-brand-600 hover:bg-brand-50',
  }
  return [base, variants[props.variant], props.block ? 'w-full' : ''].join(' ')
})
</script>

<template>
  <button :type="type" :disabled="disabled" :class="classes">
    <slot />
  </button>
</template>
