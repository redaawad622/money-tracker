import { describe, expect, it } from 'vitest'
import { reconcileSadaqa, sadaqaExpenses, type MuhasabaRow } from './sadaqa'
import type { Expense } from '../stores/expenses'

const rows: MuhasabaRow[] = [
  {
    uid: 'm1',
    data: {
      date: '2026-10-28',
      tasks: [
        { text: 'التوبة إلى الله', done: true },
        { text: 'صدقة', done: true, amount: 50, doneOn: '2026-10-29' },
        { text: 'صدقة', done: false, amount: 20 },
      ],
    },
  },
  { uid: 'm2', data: { date: '2026-10-27', tasks: [{ text: 'صدقة', done: true, amount: 0 }] } },
]

const mine: Expense = { id: 'e1', amount: 10, categoryId: 'lunch', note: '', date: '2026-10-29', createdAt: 1 }

describe('sadaqa from Azkar Tracker', () => {
  it('makes one expense per ticked sadaqa with an amount, on the day it was ticked', () => {
    expect(sadaqaExpenses(rows)).toEqual([
      { id: 'azkar-sadaqa:m1:1', amount: 50, categoryId: 'sadaqa', note: 'صدقة', date: '2026-10-29', createdAt: Date.parse('2026-10-29T12:00:00Z') },
    ])
  })

  it('adds new ones, keeps edits made here, copies amount changes and drops unticked ones', () => {
    const [w] = sadaqaExpenses(rows)
    const added = reconcileSadaqa([mine], [w])!
    expect(added.map((e) => e.id)).toEqual(['e1', w.id])
    expect(reconcileSadaqa(added, [w])).toBeNull()

    const edited = [mine, { ...w, accountId: 'cash', note: 'للمسجد' }]
    expect(reconcileSadaqa(edited, [{ ...w, amount: 70 }])![1]).toMatchObject({ amount: 70, accountId: 'cash', note: 'للمسجد' })
    expect(reconcileSadaqa(edited, [])).toEqual([mine])
  })
})
