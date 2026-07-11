/** Pure field-diff helpers for the audit log (kept free of Firebase imports
 * so they're unit-testable). */

export function isEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i])
  }
  return a === b
}

/** field → [old, new], only for fields that actually changed. */
export function diff(
  before: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, [unknown, unknown]> {
  const changes: Record<string, [unknown, unknown]> = {}
  for (const key of Object.keys(patch)) {
    if (!isEqual(before[key], patch[key])) {
      changes[key] = [before[key] ?? null, patch[key] ?? null]
    }
  }
  return changes
}
