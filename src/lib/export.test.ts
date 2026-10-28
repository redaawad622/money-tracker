import { describe, expect, it } from 'vitest'
import { CATEGORIES, type Category } from '../data/categories'
import { backupJson, expensesCsv, toCsv } from './export'

const byId = (id: string) => CATEGORIES.find((c) => c.id === id) as Category

describe('toCsv', () => {
  it('quotes cells with commas, quotes or line breaks', () => {
    expect(toCsv([['a', 'b,c', 'say "hi"', 'two\nlines', 3]])).toBe('a,"b,c","say ""hi""","two\nlines",3\r\n')
  })
})

describe('expensesCsv', () => {
  it('writes a header and one row per expense, oldest first', () => {
    const csv = expensesCsv(
      [
        { id: '2', amount: 120, categoryId: 'rent', note: '', date: '2026-10-05', createdAt: 2 },
        { id: '1', amount: 35.5, categoryId: 'lunch', note: 'with Ali, office', date: '2026-10-01', createdAt: 1, fromRewards: true },
      ],
      byId,
    )
    expect(csv.split('\r\n')).toEqual([
      'Date,Category,Type,Amount,Note,Paid from rewards',
      '2026-10-01,Lunch,Daily,35.50,"with Ali, office",yes',
      '2026-10-05,Rent,Monthly bill,120.00,,',
      '',
    ])
  })
})

describe('backupJson', () => {
  it('labels the backup and keeps the data as given', () => {
    const out = JSON.parse(backupJson({ expenses: [{ id: 'a' }] }, new Date('2026-10-28T08:00:00Z')))
    expect(out).toEqual({ app: 'money-tracker', version: 1, exportedAt: '2026-10-28T08:00:00.000Z', expenses: [{ id: 'a' }] })
  })
})
