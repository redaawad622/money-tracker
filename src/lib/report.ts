import { sumMoney } from './money'

// Pure helpers for the monthly report screen.

interface Spend {
  amount: number
  categoryId: string
  date: string
  fromRewards?: boolean
}

export interface CategoryTotal {
  id: string
  amount: number
}

/** Budget spending per category in a month, biggest first. Expenses paid from the reward pot are left out. */
export function categoryTotals(expenses: Spend[], monthKey: string): CategoryTotal[] {
  const byCat = new Map<string, number[]>()
  for (const e of expenses) {
    if (e.fromRewards || !e.date.startsWith(`${monthKey}-`)) continue
    const values = byCat.get(e.categoryId) ?? []
    values.push(e.amount)
    byCat.set(e.categoryId, values)
  }
  return [...byCat.entries()].map(([id, values]) => ({ id, amount: sumMoney(values) })).sort((a, b) => b.amount - a.amount)
}

/** Difference from the month before, and as a percent of it (null when there's nothing to compare with). */
export function change(now: number, before: number): { diff: number; percent: number | null } {
  const diff = sumMoney([now, -before])
  return { diff, percent: before > 0 ? (diff / before) * 100 : null }
}

export interface DayStats {
  /** Days counted: the whole month once it's over, up to today while it runs. */
  days: number
  average: number
  /** Index into the month of the day with the most spending, or -1 when nothing was spent. */
  highest: number
  over: number
  under: number
  noSpend: number
}

/**
 * Spending by day against each day's limit, for the first `days` days of the month.
 * A day counts as under its limit only once it's over, so today doesn't count as under while it runs.
 */
export function dayStats(totals: number[], limits: number[], days: number, finished: number): DayStats {
  let highest = -1
  let over = 0
  let under = 0
  let noSpend = 0
  for (let i = 0; i < days; i++) {
    const t = totals[i]
    if (t > 0 && (highest < 0 || t > totals[highest])) highest = i
    if (t > limits[i]) over++
    else if (i < finished) under++
    if (t === 0 && i < finished) noSpend++
  }
  const spent = sumMoney(totals.slice(0, days))
  return { days, average: days ? spent / days : 0, highest, over, under, noSpend }
}
