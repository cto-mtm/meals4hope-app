import { describe, expect, it } from 'vitest'
import { formatMoney, toDisplay, toMinor } from '../money'

describe('toMinor', () => {
  it('converts decimal strings to integer cents', () => {
    expect(toMinor('12.34')).toBe(1234)
    expect(toMinor('0.1')).toBe(10)
    expect(toMinor('100')).toBe(10000)
  })

  it('accepts comma as decimal separator (es locale habit)', () => {
    expect(toMinor('12,34')).toBe(1234)
  })

  it('avoids float drift', () => {
    expect(toMinor('0.29')).toBe(29)
    expect(toMinor('1.15')).toBe(115)
  })

  it('returns null for empty/invalid input', () => {
    expect(toMinor('')).toBeNull()
    expect(toMinor(null)).toBeNull()
    expect(toMinor(undefined)).toBeNull()
    expect(toMinor('abc')).toBeNull()
  })
})

describe('toDisplay', () => {
  it('renders cents as a 2-decimal string', () => {
    expect(toDisplay(1234)).toBe('12.34')
    expect(toDisplay(5)).toBe('0.05')
  })

  it('renders null as empty', () => {
    expect(toDisplay(null)).toBe('')
  })

  it('round-trips with toMinor', () => {
    for (const cents of [1, 99, 100, 12345, 1000000]) {
      expect(toMinor(toDisplay(cents))).toBe(cents)
    }
  })
})

describe('formatMoney', () => {
  it('shows an em dash for missing amounts', () => {
    expect(formatMoney(null, 'USD')).toBe('—')
    expect(formatMoney(undefined, 'EUR')).toBe('—')
  })

  it('includes the currency', () => {
    expect(formatMoney(150000, 'USD', 'en')).toContain('1,500')
    expect(formatMoney(150000, 'EUR', 'en')).toContain('€')
  })
})
