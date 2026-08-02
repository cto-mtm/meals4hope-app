<script setup lang="ts">
withDefaults(defineProps<{ label?: string; rows?: number; placeholder?: string }>(), {
  label: '',
  rows: 3,
  placeholder: '',
})

const model = defineModel<string | null>({ default: null })
</script>

<template>
  <label class="block">
    <span v-if="label" class="mb-1.5 block text-[12.5px] font-semibold text-ink-900">{{ label }}</span>
    <textarea
      v-model="model"
      :rows="rows"
      :placeholder="placeholder"
      class="w-full rounded-[9px] border border-line-200 bg-white px-3 py-2.5 text-[13px] leading-normal placeholder:text-ink-400 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
    />
  </label>
</template>
