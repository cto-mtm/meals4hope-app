<script setup lang="ts">
defineProps<{ message: string }>()
</script>

<template>
  <div class="rounded-[10px] border-[1.5px] border-dashed border-line-200 bg-white/50 px-6 py-10 text-center">
    <p class="text-[12.5px] text-ink-400">{{ message }}</p>
    <div class="mt-3">
      <slot />
    </div>
  </div>
</template>
