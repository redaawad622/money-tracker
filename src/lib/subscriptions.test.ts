import { describe, expect, it } from 'vitest'
import { dueDatesInMonth, lastDueDate, monthlyEquivalent, nextDueDate, type Subscription } from './subscriptions'

const quarterly: Subscription = { id: 'q', name: '3-month', amount: 120, intervalMonths: 3, anchor: '2026-09-15', paid: [] }
const monthly: Subscription = { id: 'm', name: 'Monthly', amount: 49, intervalMonths: 1, anchor: '2026-01-31', paid: [] }

describe('subscriptions', () => {
  it('finds every-3-months due dates only in the right months', () => {
    expect(dueDatesInMonth(quarterly, '2026-09')).toEqual(['2026-09-15'])
    expect(dueDatesInMonth(quarterly, '2026-10')).toEqual([])
    expect(dueDatesInMonth(quarterly, '2026-11')).toEqual([])
    expect(dueDatesInMonth(quarterly, '2026-12')).toEqual(['2026-12-15'])
    expect(dueDatesInMonth(quarterly, '2027-03')).toEqual(['2027-03-15'])
    expect(dueDatesInMonth(quarterly, '2026-06')).toEqual([])
  })

  it('keeps a month-end anchor on the last day of short months', () => {
    expect(dueDatesInMonth(monthly, '2026-02')).toEqual(['2026-02-28'])
    expect(dueDatesInMonth(monthly, '2026-04')).toEqual(['2026-04-30'])
    expect(dueDatesInMonth(monthly, '2026-05')).toEqual(['2026-05-31'])
  })

  it('finds the last and next due date', () => {
    expect(lastDueDate(quarterly, '2026-10-23')).toBe('2026-09-15')
    expect(nextDueDate(quarterly, '2026-10-23')).toBe('2026-12-15')
    expect(lastDueDate(quarterly, '2026-09-01')).toBeNull()
    expect(nextDueDate(quarterly, '2026-12-15')).toBe('2026-12-15')
  })

  it('spreads the cost per month', () => {
    expect(monthlyEquivalent(quarterly)).toBe(40)
  })
})
