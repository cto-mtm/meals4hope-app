import { ref, type Ref } from 'vue'

/**
 * Tiny loading/error/data wrapper for async reads.
 * const { data, loading, error, execute } = useAsync(() => fetchAll(...))
 */
export function useAsync<T>(fn: () => Promise<T>) {
  const data: Ref<T | null> = ref(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function execute(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      data.value = await fn()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, execute }
}
