<script setup lang="ts" generic="T extends string">
withDefaults(
  defineProps<{
    label?: string
    options: { value: T; label: string }[]
    /** Adds an empty option at the top (nullable fields). */
    allowEmpty?: boolean
    required?: boolean
    hint?: string
  }>(),
  { label: '', allowEmpty: false, required: false, hint: '' }
)

const model = defineModel<T | null>({ default: null })
</script>

<template>
  <label class="block">
    <span v-if="label" class="mb-1.5 block text-[12.5px] font-semibold text-ink-900">
      {{ label }}<span v-if="required" class="text-danger-600"> *</span>
    </span>
    <select
      v-model="model"
      :required="required"
      class="w-full rounded-[9px] border border-line-200 bg-white px-3 py-2.5 text-[13px] focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
    >
      <option v-if="allowEmpty" :value="null">—</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
    <span v-if="hint" class="mt-1 block text-[11.5px] text-ink-400">{{ hint }}</span>
  </label>
</template>
