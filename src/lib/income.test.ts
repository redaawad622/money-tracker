import { describe, expect, it } from 'vitest'
import {
  activeMonths, dealReport, dealReturnPercent, dealYearlyPercent, formatPeriod, monthlyRecurring,
  projectTotals, yearSummary, type Deal, type IncomeSource, type Investment, type Project, type Salary,
} from './income'

const salary: Salary = { id: 's', type: 'salary', name: 'Job', amount: 3000, start: '2026-04-15', end: null }
const inv: Investment = { id: 'i', type: 'investment', name: 'Fund', principal: 12000, ratePercent: 25, start: '2026-01-01', end: '2026-06-30' }
const deal = (id: string, invested: number, earned: number, start: string, end: string): Deal => ({ id, type: 'deal', name: id, invested, earned, start, end })
const project: Project = {
  id: 'p', type: 'project', name: 'Cafe',
  entries: [
    { id: '1', date: '2026-02-01', amount: 900, note: '' },
    { id: '2', date: '2026-03-01', amount: -250, note: 'rent' },
    { id: '3', date: '2025-12-31', amount: 400, note: '' },
  ],
}

describe('income', () => {
  it('counts the calendar months a source runs in a year', () => {
    expect(activeMonths('2026-04-15', null, 2026)).toBe(9)
    expect(activeMonths('2025-11-01', '2026-02-10', 2026)).toBe(2)
    expect(activeMonths('2027-01-01', null, 2026)).toBe(0)
  })

  it('earns an investment its yearly percentage month by month', () => {
    const s = yearSummary([inv], 2026)
    expect(s.investments).toBe(1500) // 12000 × 25% = 3000 a year, for 6 months
  })

  it('reports deals in the year they end', () => {
    const deals = [deal('a', 1000, 200, '2026-01-01', '2026-07-01'), deal('b', 4000, 400, '2025-06-01', '2026-03-01'), deal('c', 500, 50, '2026-10-01', '2027-02-01')]
    const r = dealReport(deals, 2026)
    expect(r.count).toBe(2)
    expect(r.invested).toBe(5000)
    expect(r.earned).toBe(600)
    expect(r.returnPercent).toBeCloseTo(12)
    expect(r.best?.id).toBe('a')
    expect(dealReturnPercent(deals[0])).toBe(20)
    expect(dealYearlyPercent(deals[0])).toBeCloseTo((20 * 365) / 181)
  })

  it('nets a project’s earnings and costs for the year', () => {
    expect(projectTotals(project, 2026)).toEqual({ earnings: 900, costs: 250, net: 650 })
  })

  it('adds everything up for the year and the month', () => {
    const all: IncomeSource[] = [salary, inv, deal('a', 1000, 200, '2026-01-01', '2026-07-01'), project]
    expect(yearSummary(all, 2026)).toEqual({ salary: 27000, investments: 1500, deals: 200, projects: 650, total: 29350 })
    expect(monthlyRecurring(all, '2026-05')).toBe(3250)
    expect(monthlyRecurring(all, '2026-08')).toBe(3000)
  })

  it('describes a period in days, months or years', () => {
    expect(formatPeriod(10)).toBe('10 days')
    expect(formatPeriod(181)).toBe('6 months')
    expect(formatPeriod(1100)).toBe('3 years')
  })
})
