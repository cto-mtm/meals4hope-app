import type { Currency } from '../types/models'

/**
 * Amounts are stored as integer minor units (cents) + ISO currency code.
 * These helpers are the only place that converts to/from display decimals.
 */

export function toMinor(display: string | number | null | undefined): number | null {
  if (display === null || display === undefined || display === '') return null
  const n = typeof display === 'number' ? display : Number(String(display).replace(',', '.'))
  if (Number.isNaN(n)) return null
  return Math.round(n * 100)
}

export function toDisplay(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return ''
  return (minor / 100).toFixed(2)
}

const SYMBOLS: Record<Currency, string> = { USD: '$', EUR: '€', GBP: '£', VES: 'Bs.' }

export function formatMoney(minor: number | null | undefined, moneda: Currency, locale = 'es'): string {
  if (minor === null || minor === undefined) return '—'
  const value = minor / 100
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: moneda }).format(value)
  } catch {
    return `${SYMBOLS[moneda] ?? moneda} ${value.toFixed(2)}`
  }
}
