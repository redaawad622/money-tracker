import type { Expense } from '../stores/expenses'

// Sadaqa given in Azkar Tracker's محاسبة النفس, added here as expenses. Azkar Tracker syncs each
// entry (table "azkar_records", kind "muhasaba") with its tasks; a صدقة task ticked off with an
// amount becomes one expense in the Sadaqa category, on the day it was ticked. Azkar Tracker stays
// the source: unticking it, or deleting the entry, takes the expense back out, and a changed amount
// or day is copied over, while the account, store, note and category chosen here are kept.

export const SADAQA_CATEGORY = 'sadaqa'
const PREFIX = 'azkar-sadaqa:'

export interface MuhasabaRow {
  uid: string
  data: { date?: string; tasks?: { text?: string; done?: boolean; amount?: number; doneOn?: string }[] }
}

export const isAzkarSadaqa = (e: Pick<Expense, 'id'>) => e.id.startsWith(PREFIX)

/** The expenses the synced محاسبة entries call for, with an id that is the same on every device. */
export function sadaqaExpenses(rows: MuhasabaRow[]): Expense[] {
  const out: Expense[] = []
  for (const { uid, data } of rows) {
    ;(data?.tasks ?? []).forEach((t, i) => {
      const date = t.doneOn ?? data.date
      if (!t.done || !(Number(t.amount) > 0) || !date) return
      out.push({
        id: `${PREFIX}${uid}:${i}`,
        amount: Number(t.amount),
        categoryId: SADAQA_CATEGORY,
        note: t.text ?? '',
        date,
        createdAt: Date.parse(`${date}T12:00:00Z`),
      })
    })
  }
  return out
}

/**
 * The expense list with the Azkar sadaqa brought up to date, or null when nothing changed. Pass
 * `wanted` only when Azkar Tracker's rows could be read this time; otherwise leave them as they are.
 */
export function reconcileSadaqa(expenses: Expense[], wanted: Expense[]): Expense[] | null {
  const byId = new Map(wanted.map((e) => [e.id, e]))
  let changed = false
  const out: Expense[] = []
  for (const e of expenses) {
    if (!isAzkarSadaqa(e)) {
      out.push(e)
      continue
    }
    const w = byId.get(e.id)
    byId.delete(e.id)
    if (!w) changed = true
    else if (w.amount !== e.amount || w.date !== e.date) {
      out.push({ ...e, amount: w.amount, date: w.date })
      changed = true
    } else out.push(e)
  }
  for (const w of byId.values()) {
    out.push(w)
    changed = true
  }
  return changed ? out : null
}
