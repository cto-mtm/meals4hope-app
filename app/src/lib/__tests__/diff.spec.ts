import { describe, expect, it } from 'vitest'
import { diff, isEqual } from '../diff'

describe('isEqual', () => {
  it('compares primitives strictly', () => {
    expect(isEqual(1, 1)).toBe(true)
    expect(isEqual(null, undefined)).toBe(false)
    expect(isEqual('a', 'a')).toBe(true)
  })

  it('compares arrays element-wise (catalog multi-selects)', () => {
    expect(isEqual(['a', 'b'], ['a', 'b'])).toBe(true)
    expect(isEqual(['a', 'b'], ['b', 'a'])).toBe(false)
    expect(isEqual(['a'], ['a', 'b'])).toBe(false)
  })
})

describe('diff', () => {
  it('captures only changed fields as [old, new]', () => {
    const changes = diff(
      { titulo: 'Viejo', montoMinor: 100, estado: 'planificada' },
      { titulo: 'Nuevo', montoMinor: 100, estado: 'ejecutada' }
    )
    expect(changes).toEqual({
      titulo: ['Viejo', 'Nuevo'],
      estado: ['planificada', 'ejecutada'],
    })
  })

  it('returns empty object when nothing changed (no audit entry written)', () => {
    expect(diff({ a: 1, tags: ['x'] }, { a: 1, tags: ['x'] })).toEqual({})
  })

  it('normalizes undefined to null (nullable-friendly records)', () => {
    expect(diff({}, { fecha: '2026-07-11' })).toEqual({ fecha: [null, '2026-07-11'] })
    expect(diff({ fecha: '2026-07-11' }, { fecha: undefined })).toEqual({
      fecha: ['2026-07-11', null],
    })
  })

  it('detects array changes', () => {
    expect(diff({ areas: ['a'] }, { areas: ['a', 'b'] })).toEqual({
      areas: [['a'], ['a', 'b']],
    })
  })
})
