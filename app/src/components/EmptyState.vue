<script setup lang="ts">
defineProps<{ message: string }>()
</script>

<template>
  <div class="rounded-xl border border-dashed border-stone-300 bg-white/50 px-6 py-10 text-center">
    <p class="text-sm text-stone-500">{{ message }}</p>
    <div class="mt-3">
      <slot />
    </div>
  </div>
</template>
