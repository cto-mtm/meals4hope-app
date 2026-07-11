<script setup lang="ts" generic="T extends string">
withDefaults(
  defineProps<{
    label?: string
    options: { value: T; label: string }[]
    /** Adds an empty option at the top (nullable fields). */
    allowEmpty?: boolean
    required?: boolean
  }>(),
  { label: '', allowEmpty: false, required: false }
)

const model = defineModel<T | null>({ default: null })
</script>

<template>
  <label class="block">
    <span v-if="label" class="mb-1 block text-sm font-medium text-stone-600">
      {{ label }}<span v-if="required" class="text-red-500"> *</span>
    </span>
    <select
      v-model="model"
      :required="required"
      class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
    >
      <option v-if="allowEmpty" :value="null">—</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
  </label>
</template>
