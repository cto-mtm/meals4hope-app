<script setup lang="ts">
// Bottom sheet on mobile, centered modal on desktop. Uses Recipe 5
// ("sheet") from transitions.css.
defineProps<{ open: boolean; title: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
        @click.self="emit('close')"
      >
        <div class="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 pb-safe shadow-xl sm:rounded-2xl">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-base font-semibold text-stone-800">{{ title }}</h2>
            <button
              type="button"
              class="rounded-full p-1.5 text-stone-400 hover:bg-stone-100"
              aria-label="×"
              @click="emit('close')"
            >
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
