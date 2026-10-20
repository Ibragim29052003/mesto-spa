import { describe, expect, it } from 'vitest'
import {
  calendarCells,
  calendarStart,
  shiftDays,
  shiftMonth,
} from '../src/calendar'

describe('local calendar navigation', () => {
  it('starts weeks on Monday and includes only real days', () => {
    const cells = calendarCells('2026-10-20')
    expect(cells.slice(0, 4)).toEqual([null, null, null, '2026-10-01'])
    expect(cells.filter(Boolean)).toHaveLength(31)
    expect(cells.length % 7).toBe(0)
  })
  it('handles leap years and a month starting on Monday', () => {
    expect(calendarCells('2028-02-01').filter(Boolean)).toHaveLength(29)
    expect(calendarCells('2027-02-01')).toHaveLength(28)
    expect(calendarCells('2027-02-01')[0]).toBe('2027-02-01')
  })
  it('moves by days across month and year boundaries', () => {
    expect(shiftDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftDays('2028-03-01', -1)).toBe('2028-02-29')
  })
  it('clamps month movement to the last valid date', () => {
    expect(shiftMonth('2026-01-31', 1)).toBe('2026-02-28')
    expect(shiftMonth('2028-01-31', 1)).toBe('2028-02-29')
    expect(shiftMonth('2028-02-29', 12)).toBe('2029-02-28')
  })
  it('moves backward and forward across years', () => {
    expect(shiftMonth('2026-01-15', -1)).toBe('2025-12-15')
    expect(shiftMonth('2026-12-15', 1)).toBe('2027-01-15')
  })
  it('uses selected future dates, or today for missing, damaged or past values', () => {
    expect(calendarStart('2026-11-01', '2026-10-20')).toBe('2026-11-01')
    for (const date of ['', 'not-a-date', '2026-02-31', '2026-10-19'])
      expect(calendarStart(date, '2026-10-20')).toBe('2026-10-20')
  })
})
