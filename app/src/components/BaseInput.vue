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
    <span v-if="label" class="mb-1.5 block text-[12.5px] font-semibold text-ink-900">
      {{ label }}<span v-if="required" class="text-danger-600"> *</span>
    </span>
    <input
      v-model="model"
      :type="type"
      :placeholder="placeholder"
      :required="required"
      class="w-full rounded-[9px] border border-line-200 bg-white px-3 py-2.5 text-[13px] placeholder:text-ink-400 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
    />
    <span v-if="hint" class="mt-1 block text-[11.5px] text-ink-400">{{ hint }}</span>
  </label>
</template>
