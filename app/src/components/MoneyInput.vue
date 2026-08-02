<script setup lang="ts">
// v-model is the stored integer minor units (cents); the input shows a
// decimal. Conversion happens only here + lib/money.ts.
import { ref, watch } from 'vue'
import { toDisplay, toMinor } from '../lib/money'

defineProps<{ label?: string }>()

const model = defineModel<number | null>({ default: null })
const display = ref(toDisplay(model.value))

watch(model, (v) => {
  if (toMinor(display.value) !== v) display.value = toDisplay(v)
})

function onInput(e: Event) {
  display.value = (e.target as HTMLInputElement).value
  model.value = toMinor(display.value)
}
</script>

<template>
  <label class="block">
    <span v-if="label" class="mb-1.5 block text-[12.5px] font-semibold text-ink-900">{{ label }}</span>
    <input
      :value="display"
      type="text"
      inputmode="decimal"
      placeholder="0.00"
      class="w-full rounded-[9px] border border-line-200 bg-white px-3 py-2.5 text-[13px] placeholder:text-ink-400 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
      @input="onInput"
    />
  </label>
</template>
