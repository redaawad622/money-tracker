import { addMonths, monthKeyOf } from './dates'

export type IntervalMonths = 1 | 3

export interface Subscription {
  id: string
  name: string
  amount: number
  intervalMonths: IntervalMonths
  /** First payment date; later payments repeat every intervalMonths from here. */
  anchor: string
  /** Due dates that have been marked as paid. */
  paid: string[]
}

/** Due dates between from and to (inclusive), as YYYY-MM-DD. */
export function dueDatesBetween(sub: Subscription, from: string, to: string): string[] {
  const out: string[] = []
  for (let k = 0; k < 1200; k++) {
    const d = addMonths(sub.anchor, k * sub.intervalMonths)
    if (d > to) break
    if (d >= from) out.push(d)
  }
  return out
}

export function dueDatesInMonth(sub: Subscription, monthKey: string): string[] {
  return dueDatesBetween(sub, `${monthKey}-01`, `${monthKey}-31`).filter((d) => monthKeyOf(d) === monthKey)
}

export function nextDueDate(sub: Subscription, today: string): string {
  for (let k = 0; k < 1200; k++) {
    const d = addMonths(sub.anchor, k * sub.intervalMonths)
    if (d >= today) return d
  }
  return sub.anchor
}

/** Most recent due date on or before today, or null if the first payment is still ahead. */
export function lastDueDate(sub: Subscription, today: string): string | null {
  let last: string | null = null
  for (let k = 0; k < 1200; k++) {
    const d = addMonths(sub.anchor, k * sub.intervalMonths)
    if (d > today) break
    last = d
  }
  return last
}

export function monthlyEquivalent(sub: Subscription): number {
  return sub.amount / sub.intervalMonths
}
