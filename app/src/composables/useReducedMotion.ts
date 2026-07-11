import { onUnmounted, ref } from 'vue'

/** Reactive prefers-reduced-motion media query. */
export function useReducedMotion() {
  const mq = matchMedia('(prefers-reduced-motion: reduce)')
  const reduced = ref(mq.matches)
  const onChange = (e: MediaQueryListEvent) => (reduced.value = e.matches)
  mq.addEventListener('change', onChange)
  onUnmounted(() => mq.removeEventListener('change', onChange))
  return reduced
}
