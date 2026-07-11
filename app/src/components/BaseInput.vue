<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    type?: string
    placeholder?: string
    required?: boolean
    hint?: string
  }>(),
  { label: '', type: 'text', placeholder: '', required: false, hint: '' }
)

const model = defineModel<string | null>({ default: null })
</script>

<template>
  <label class="block">
    <span v-if="label" class="mb-1 block text-sm font-medium text-stone-600">
      {{ label }}<span v-if="required" class="text-red-500"> *</span>
    </span>
    <input
      v-model="model"
      :type="type"
      :placeholder="placeholder"
      :required="required"
      class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
    />
    <span v-if="hint" class="mt-1 block text-xs text-stone-400">{{ hint }}</span>
  </label>
</template>
