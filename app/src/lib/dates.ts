/**
 * Date-only fields ('YYYY-MM-DD' strings) parsed as LOCAL dates.
 * `new Date('2026-07-10')` would parse as UTC midnight and render as the
 * previous day in negative-offset timezones — this helper avoids that.
 * Rendering still goes through i18n's d() with a named format.
 */
export function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}
