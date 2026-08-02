<script setup lang="ts">
// Searchable dropdown: type to filter options by name, results render in
// the dropdown lazily — first 8 matches, then "+5" per click on load-more.
// Used where a plain <select> gets unwieldy (e.g. organizador filters).
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const PAGE_SIZE = 8
const PAGE_INCREMENT = 5

const props = defineProps<{
  options: { value: string; label: string }[]
  placeholder: string
}>()

const model = defineModel<string | null>({ default: null })
const { t } = useI18n()

const open = ref(false)
const query = ref('')
const visibleCount = ref(PAGE_SIZE)

const selectedLabel = computed(
  () => props.options.find((o) => o.value === model.value)?.label ?? ''
)

/** What the input shows: live query while open, selected label when closed. */
const inputText = computed(() => (open.value ? query.value : selectedLabel.value))

const matches = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return props.options
  return props.options.filter((o) => o.label.toLowerCase().includes(q))
})
const visible = computed(() => matches.value.slice(0, visibleCount.value))
const hasMore = computed(() => matches.value.length > visibleCount.value)

// New letters typed → the lazy window resets to the first page.
watch(query, () => {
  visibleCount.value = PAGE_SIZE
})

function onFocus() {
  query.value = ''
  visibleCount.value = PAGE_SIZE
  open.value = true
}

function onInput(e: Event) {
  query.value = (e.target as HTMLInputElement).value
}

function select(value: string) {
  model.value = value
  open.value = false
}

function clear() {
  model.value = null
  query.value = ''
  open.value = false
}

function onBlur() {
  // mousedown.prevent on the options keeps focus, so a real blur = click-away.
  open.value = false
}
</script>

<template>
  <div class="relative">
    <div class="relative">
      <svg class="pointer-events-none absolute top-1/2 left-2.5 h-3 w-3 -translate-y-1/2 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </svg>
      <input
        :value="inputText"
        type="text"
        :placeholder="placeholder"
        class="w-full rounded-[9px] border border-line-200 bg-white py-1.5 pr-7 pl-7.5 text-[12.5px] text-ink-600 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none"
        :class="model ? 'font-semibold text-ink-900' : ''"
        @focus="onFocus"
        @input="onInput"
        @blur="onBlur"
        @keydown.escape="open = false"
        @keydown.enter.prevent="visible.length === 1 && select(visible[0]!.value)"
      />
      <button
        v-if="model"
        type="button"
        class="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-full p-0.5 text-ink-400 hover:bg-mist-100 hover:text-ink-600"
        :aria-label="t('common.limpiar')"
        @mousedown.prevent="clear"
      >
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>

    <div
      v-if="open"
      class="absolute top-full left-0 z-30 mt-1 max-h-72 w-full min-w-52 overflow-y-auto rounded-[10px] border border-line-200 bg-white py-1 shadow-lg"
    >
      <p v-if="visible.length === 0" class="px-3 py-2.5 text-[12.5px] text-ink-400">
        {{ t('common.sinResultados') }}
      </p>
      <button
        v-for="opt in visible"
        :key="opt.value"
        type="button"
        class="block w-full truncate px-3 py-2 text-left text-[12.5px] hover:bg-mist-200"
        :class="opt.value === model ? 'font-bold text-brand-600' : 'text-ink-900'"
        @mousedown.prevent="select(opt.value)"
      >
        {{ opt.label }}
      </button>
      <button
        v-if="hasMore"
        type="button"
        class="block w-full border-t border-line-100 px-3 py-2 text-left text-[12px] font-semibold text-brand-600 hover:bg-mist-200"
        @mousedown.prevent="visibleCount += PAGE_INCREMENT"
      >
        {{ t('common.cargarMas') }}
      </button>
    </div>
  </div>
</template>
