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
    <span v-if="label" class="mb-1 block text-sm font-medium text-stone-600">{{ label }}</span>
    <textarea
      v-model="model"
      :rows="rows"
      :placeholder="placeholder"
      class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
    />
  </label>
</template>
