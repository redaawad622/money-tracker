import { describe, expect, it } from 'vitest'
import { dueSoon, reminderId, upcomingReminders } from './reminders'
import type { Subscription } from './subscriptions'

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  id: 's1', name: 'Internet', amount: 250, intervalMonths: 1, anchor: '2026-01-10', paid: [], ...over,
})
const fmt = (n: number) => `EGP ${n}`

describe('upcomingReminders', () => {
  it('reminds the chosen days before each unpaid due date at 9:00', () => {
    const r = upcomingReminders([sub()], new Date(2026, 9, 28, 8, 0), 1, fmt, 50)
    expect(r.map((x) => [x.dueDate, x.at.getDate(), x.at.getMonth() + 1, x.at.getHours()])).toEqual([
      ['2026-11-10', 9, 11, 9],
      ['2026-12-10', 9, 12, 9],
    ])
    expect(r[0].title).toBe('Internet is due tomorrow')
    expect(r[0].body).toBe('EGP 250. Mark it paid in Fixed once it\'s done.')
  })

  it('skips paid due dates and reminders whose time has passed', () => {
    const now = new Date(2026, 10, 9, 10, 0) // 9 Nov, after 9:00
    const r = upcomingReminders([sub({ paid: ['2026-12-10'] })], now, 1, fmt, 70)
    expect(r.map((x) => x.dueDate)).toEqual(['2027-01-10'])
  })

  it('says "today" when reminding on the due date', () => {
    const r = upcomingReminders([sub()], new Date(2026, 10, 1), 0, fmt, 20)
    expect(r[0].title).toBe('Internet is due today')
  })

  it('keeps ids stable for the same bill and date', () => {
    expect(reminderId('s1', '2026-11-10')).toBe(reminderId('s1', '2026-11-10'))
    expect(reminderId('s1', '2026-11-10')).not.toBe(reminderId('s1', '2026-12-10'))
    expect(reminderId('s1', '2026-11-10')).toBeGreaterThan(0)
  })
})

describe('dueSoon', () => {
  it('lists unpaid due dates from today through the next days', () => {
    const subs = [sub(), sub({ id: 's2', name: 'Rent', anchor: '2026-01-29', paid: ['2026-10-29'] })]
    expect(dueSoon(subs, '2026-11-08', 3).map((d) => [d.sub.name, d.date])).toEqual([['Internet', '2026-11-10']])
    expect(dueSoon(subs, '2026-10-28', 3)).toEqual([])
  })
})
