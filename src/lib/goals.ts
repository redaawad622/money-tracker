import { daysBetween } from './dates'
import { sumMoney } from './money'

// Savings goals: a target amount, an optional date, and the money put aside (or taken back) for it.
// Saving for a goal is kept apart from spending, so it never counts against the budget.

export interface GoalEntry {
  id: string
  /** Local date, YYYY-MM-DD */
  date: string
  /** Positive when money is put aside, negative when it is taken back. */
  amount: number
  note?: string
}

export interface Goal {
  id: string
  name: string
  target: number
  /** Optional date to reach the target by, YYYY-MM-DD. */
  targetDate?: string
  entries: GoalEntry[]
}

export function saved(goal: Goal): number {
  return sumMoney(goal.entries.map((e) => e.amount))
}

export function progress(goal: Goal): number {
  return goal.target > 0 ? Math.min(1, Math.max(0, saved(goal) / goal.target)) : 0
}

/**
 * How much to put aside each month from today to reach the target on its date; null with no date,
 * once reached, or once the date has passed. A month left counts as one even when it's part of one.
 */
export function perMonthNeeded(goal: Goal, today: string): number | null {
  const left = goal.target - saved(goal)
  if (!goal.targetDate || left <= 0 || goal.targetDate < today) return null
  const months = Math.max(1, Math.ceil(daysBetween(today, goal.targetDate) / 30.44))
  return Math.ceil((left / months) * 100) / 100
}
