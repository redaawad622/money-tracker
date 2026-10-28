import { describe, expect, it } from 'vitest'
import { perMonthNeeded, progress, saved, type Goal } from './goals'

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g', name: 'Car', target: 12000, targetDate: '2027-10-28',
  entries: [{ id: '1', date: '2026-09-01', amount: 2500 }, { id: '2', date: '2026-10-01', amount: 1000 }, { id: '3', date: '2026-10-10', amount: -500 }],
  ...over,
})

describe('goals', () => {
  it('adds up what was put aside and taken back', () => {
    expect(saved(goal())).toBe(3000)
    expect(progress(goal())).toBe(0.25)
  })

  it('caps progress at 100%', () => {
    expect(progress(goal({ target: 1000 }))).toBe(1)
  })

  it('splits what is left over the months to the target date', () => {
    expect(perMonthNeeded(goal(), '2026-10-28')).toBe(750) // 9000 over 12 months
  })

  it('has no monthly amount without a date, once reached, or after the date', () => {
    expect(perMonthNeeded(goal({ targetDate: undefined }), '2026-10-28')).toBeNull()
    expect(perMonthNeeded(goal({ target: 3000 }), '2026-10-28')).toBeNull()
    expect(perMonthNeeded(goal({ targetDate: '2026-10-01' }), '2026-10-28')).toBeNull()
  })

  it('counts a part month as one', () => {
    expect(perMonthNeeded(goal({ targetDate: '2026-11-10' }), '2026-10-28')).toBe(9000)
  })
})
