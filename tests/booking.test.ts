import { describe, expect, it } from 'vitest'
import {
  STORAGE_KEY,
  formatDate,
  isCalendarDate,
  localDate,
  readBooking,
  removeBooking,
  saveBooking,
  validate,
  type Booking,
} from '../src/booking'

const booking: Booking = {
  version: 1,
  name: 'Анна-Мария Lee',
  programId: 'deep',
  date: '2026-10-20',
}
function storage(raw: string | null = null) {
  let value = raw
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next
    },
    removeItem: () => {
      value = null
    },
  }
}

describe('local calendar and validation', () => {
  it('formats local calendar components, including midnight', () => {
    expect(localDate(new Date(2026, 0, 1, 0, 1))).toBe('2026-01-01')
    expect(localDate(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })
  it.each([
    '2026-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-00-01',
    '2026-01-00',
    '26-01-01',
    '2026-1-1',
    '',
    null,
    42,
    '0000-01-01',
  ])('rejects invalid calendar value %s', (value) => {
    expect(isCalendarDate(value)).toBe(false)
  })
  it('accepts leap day and formats Russian date without UTC conversion', () => {
    expect(isCalendarDate('2028-02-29')).toBe(true)
    expect(formatDate('2026-10-20')).toContain('20 октября 2026')
  })
  it('reports all empty fields and whitespace names', () => {
    expect(
      Object.keys(
        validate({ name: '  ', programId: '', date: '' }, '2026-10-20'),
      ),
    ).toEqual(['name', 'programId', 'date'])
  })
  it('accepts today, future dates and names from different alphabets', () => {
    for (const name of ['Анна-Мария', 'Li 王', 'O’Connor', 'نور', '  Саша  ']) {
      expect(validate({ ...booking, name }, '2026-10-20')).toEqual({})
    }
    expect(validate({ ...booking, date: '2026-10-21' }, '2026-10-20')).toEqual(
      {},
    )
  })
  it('rejects past, malformed dates, unknown programs and excessive name length', () => {
    expect(
      validate({ ...booking, date: '2026-10-19' }, '2026-10-20').date,
    ).toMatch('прошла')
    expect(validate({ ...booking, date: '2026-02-30' }).date).toMatch(
      'корректную',
    )
    expect(validate({ ...booking, programId: 'other' }).programId).toBeTruthy()
    expect(validate({ ...booking, name: 'a'.repeat(81) }).name).toBeTruthy()
  })
})

describe('browser persistence boundary', () => {
  it('handles missing data', () =>
    expect(readBooking(() => storage())).toEqual({
      booking: null,
      issue: null,
    }))
  it('saves, restores and deletes only its own key', () => {
    const store = storage()
    expect(saveBooking(booking, () => store)).toBe(true)
    expect(store.getItem()).toBe(JSON.stringify(booking))
    expect(readBooking(() => store)).toEqual({ booking, issue: null })
    expect(removeBooking(() => store)).toBe(true)
    expect(readBooking(() => store).booking).toBeNull()
    expect(STORAGE_KEY).toBe('mesto-spa.booking.v1')
  })
  it.each([
    '{broken',
    'null',
    '[]',
    '42',
    '{}',
    '{"version":2}',
    JSON.stringify({ ...booking, programId: 'unknown' }),
    JSON.stringify({ ...booking, name: '  ' }),
    JSON.stringify({ ...booking, date: '2026-02-31' }),
  ])('tolerates damaged or incompatible data: %s', (raw) => {
    expect(readBooking(() => storage(raw))).toEqual({
      booking: null,
      issue: 'invalid',
    })
  })
  it('restores old valid applications and drops unexpected fields', () => {
    const old = { ...booking, date: '2020-01-01' }
    expect(
      readBooking(() => storage(JSON.stringify({ ...old, token: 'ignored' }))),
    ).toEqual({ booking: old, issue: null })
  })
  it('catches inaccessible storage getters and write/delete exceptions', () => {
    const denied = () => {
      throw new Error('SecurityError')
    }
    expect(readBooking(denied)).toEqual({ booking: null, issue: 'unavailable' })
    expect(saveBooking(booking, denied)).toBe(false)
    expect(removeBooking(denied)).toBe(false)
    const quota = {
      ...storage(),
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(saveBooking(booking, () => quota)).toBe(false)
  })
})
