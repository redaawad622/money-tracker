import type { Category } from '../data/categories'
import type { Expense } from '../stores/expenses'

// What "Export" in Settings writes: expenses as a CSV for spreadsheets, or everything as a JSON backup.

function csvCell(v: string | number): string {
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

/** One row per expense, oldest first. */
export function expensesCsv(expenses: Expense[], categoryById: (id: string) => Category): string {
  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
  return toCsv([
    ['Date', 'Category', 'Type', 'Amount', 'Note', 'Paid from rewards'],
    ...sorted.map((e) => {
      const c = categoryById(e.categoryId)
      return [e.date, c.name, c.group === 'monthly' ? 'Monthly bill' : 'Daily', e.amount.toFixed(2), e.note, e.fromRewards ? 'yes' : '']
    }),
  ])
}

export const BACKUP_VERSION = 1

export function backupJson(data: Record<string, unknown>, now = new Date()): string {
  return JSON.stringify({ app: 'money-tracker', version: BACKUP_VERSION, exportedAt: now.toISOString(), ...data }, null, 2)
}
