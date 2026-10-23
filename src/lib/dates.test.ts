import { describe, expect, it } from 'vitest'
import { addMonths, addMonthsToKey, daysBetween, mondayIndex, monthDates, toYmd } from './dates'

describe('dates', () => {
  it('uses the local calendar day, not UTC', () => {
    // 00:30 local time must stay on the 23rd in any time zone
    expect(toYmd(new Date(2026, 9, 23, 0, 30))).toBe('2026-10-23')
    expect(toYmd(new Date(2026, 9, 23, 23, 59))).toBe('2026-10-23')
  })

  it('clamps month-end dates', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2026-01-31', 3)).toBe('2026-04-30')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15')
  })

  it('moves between months and counts days', () => {
    expect(addMonthsToKey('2026-12', 1)).toBe('2027-01')
    expect(addMonthsToKey('2026-01', -1)).toBe('2025-12')
    expect(monthDates('2026-02')).toHaveLength(28)
    expect(daysBetween('2026-10-23', '2026-12-15')).toBe(53)
  })

  it('knows the weekday', () => {
    expect(mondayIndex('2026-10-01')).toBe(3) // Thursday
    expect(mondayIndex('2026-10-23')).toBe(4) // Friday
  })
})
