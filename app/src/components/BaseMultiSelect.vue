<script setup lang="ts">
// Multi-select rendered as toggleable chips — thumb-friendly on phones
// (volunteers register initiatives from events).
export interface MultiOption {
  value: string
  label: string
}

defineProps<{ label?: string; options: MultiOption[] }>()

const model = defineModel<string[]>({ default: () => [] })

function toggle(value: string) {
  model.value = model.value.includes(value)
    ? model.value.filter((v) => v !== value)
    : [...model.value, value]
}
</script>

<template>
  <div>
    <span v-if="label" class="mb-1.5 block text-sm font-medium text-stone-600">{{ label }}</span>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        class="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
        :class="
          model.includes(opt.value)
            ? 'border-brand-700 bg-brand-700 text-white'
            : 'border-stone-300 bg-white text-stone-600 hover:border-brand-600'
        "
        @click="toggle(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>
