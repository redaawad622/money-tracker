import { describe, expect, it } from 'vitest'
import { balance, movements, type Account, type Paid, type Transfer } from './accounts'

const start = new Date(2026, 9, 20, 12, 0).getTime() // 20 Oct, noon
const cash: Account = { id: 'cash', name: 'Cash', kind: 'cash', startBalance: 1000, startAt: start }
const bank: Account = { id: 'bank', name: 'Bank', kind: 'bank', startBalance: 5000, startAt: start }

const at = (d: number, h = 13) => new Date(2026, 9, d, h, 0).getTime()
const paid = (id: string, amount: number, d: number, accountId?: string, h = 13): Paid =>
  ({ id, amount, date: `2026-10-${d}`, createdAt: at(d, h), accountId })
const transfer = (id: string, from: string | null, to: string, amount: number, d: number): Transfer =>
  ({ id, from, to, amount, date: `2026-10-${d}`, note: '', createdAt: at(d) })

describe('account balance', () => {
  it('takes off expenses paid with the account after its balance was set', () => {
    const list = [
      paid('a', 50, 21, 'cash'),
      paid('b', 30, 20, 'cash', 9), // same day, before the balance was set
      paid('c', 70, 19, 'cash'), // the day before
      paid('d', 40, 22, 'bank'),
      paid('e', 20, 22), // no account
    ]
    expect(balance(cash, [], list)).toBe(950)
    expect(balance(bank, [], list)).toBe(4960)
  })

  it('moves money between accounts without changing the total', () => {
    const t = [transfer('t1', 'bank', 'cash', 500, 23)]
    expect(balance(cash, t, [])).toBe(1500)
    expect(balance(bank, t, [])).toBe(4500)
  })

  it('adds money coming in from outside', () => {
    expect(balance(bank, [transfer('t1', null, 'bank', 12000, 25)], [])).toBe(17000)
  })

  it('lists movements newest first, with signs', () => {
    const m = movements(cash, [transfer('t1', 'bank', 'cash', 500, 23)], [paid('a', 50, 21, 'cash'), paid('b', 10, 24, 'cash')])
    expect(m.map((x) => [x.id, x.kind, x.amount])).toEqual([
      ['b', 'expense', -10],
      ['t1', 'in', 500],
      ['a', 'expense', -50],
    ])
  })
})
