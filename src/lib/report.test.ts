import { describe, expect, it } from 'vitest'
import { monthIncome, type IncomeSource } from './income'
import { categoryTotals, change, dayStats } from './report'

describe('report', () => {
  it('totals the month by category, leaving out other months and reward spending', () => {
    const list = [
      { amount: 20, categoryId: 'lunch', date: '2026-10-01' },
      { amount: 15.5, categoryId: 'lunch', date: '2026-10-09' },
      { amount: 60, categoryId: 'gas', date: '2026-10-03' },
      { amount: 99, categoryId: 'gas', date: '2026-09-30' },
      { amount: 40, categoryId: 'shopping', date: '2026-10-04', fromRewards: true },
    ]
    expect(categoryTotals(list, '2026-10')).toEqual([{ id: 'gas', amount: 60 }, { id: 'lunch', amount: 35.5 }])
  })

  it('compares with the previous month', () => {
    expect(change(120, 100)).toEqual({ diff: 20, percent: 20 })
    expect(change(80, 100)).toEqual({ diff: -20, percent: -20 })
    expect(change(50, 0)).toEqual({ diff: 50, percent: null })
  })

  it('counts days over and under their limits, only finished days as under', () => {
    const totals = [0, 30, 120, 50, 200, 0]
    const limits = [100, 100, 100, 100, 100, 100]
    // 5 days so far, today (index 4) still running
    const s = dayStats(totals, limits, 5, 4)
    expect(s).toMatchObject({ days: 5, highest: 4, over: 2, under: 3, noSpend: 1 })
    expect(s.average).toBe(80)
    expect(dayStats([0, 0], [10, 10], 2, 2).highest).toBe(-1)
  })

  it('adds up one month of income', () => {
    const sources: IncomeSource[] = [
      { id: 's', type: 'salary', name: 'Job', amount: 3000, start: '2026-04-15', end: null },
      { id: 'i', type: 'investment', name: 'Fund', principal: 12000, ratePercent: 25, start: '2026-01-01', end: '2026-06-30' },
      { id: 'd', type: 'deal', name: 'Deal', invested: 1000, earned: 300, start: '2026-01-01', end: '2026-05-20' },
      {
        id: 'p', type: 'project', name: 'Cafe',
        entries: [
          { id: '1', date: '2026-05-01', amount: 900, note: '' },
          { id: '2', date: '2026-05-10', amount: -250, note: 'rent' },
          { id: '3', date: '2026-06-01', amount: 400, note: '' },
        ],
      },
    ]
    expect(monthIncome(sources, '2026-05')).toEqual({ salary: 3000, investments: 250, deals: 300, projects: 650, total: 4200 })
    expect(monthIncome(sources, '2026-03')).toEqual({ salary: 0, investments: 250, deals: 0, projects: 0, total: 250 })
  })
})
