/**
 * Typed fetch wrapper for the Cloud Functions API (user provisioning, health).
 * The only place VITE_API_URL is read. Never throws — failures surface in
 * the return value.
 */
import { auth } from './firebase'

const BASE_URL: string =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV
    ? 'http://127.0.0.1:5001/demo-meals4hope/us-central1/api'
    : 'https://us-central1-REPLACE_ME.cloudfunctions.net/api')

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const user = auth.currentUser
    if (user) headers['Authorization'] = `Bearer ${await user.getIdToken()}`

    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: typeof body?.error === 'string' ? body.error : `HTTP ${res.status}` }
    }
    return { ok: true, data: body as T }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error' }
  }
}
