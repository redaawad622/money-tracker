/**
 * Daily limits for a month when each day's difference from its limit is spread over the days that follow.
 *
 * Every day starts at the same base limit. Whatever a day goes over its own limit is split evenly
 * across the remaining days of the month and taken off their limits. Whatever a finished day stays
 * under its limit is split the same way and added to them. Only finished days pass on what they
 * left unspent: today can still be spent.
 *
 * A limit never drops below zero: any cut a day cannot absorb is passed on to the days after it,
 * so the total moved always equals the total difference. The last day has nowhere to pass it to.
 *
 * @param base the normal daily limit
 * @param totals what was spent on each day of the month, in order
 * @param finished how many days at the start of the month are over and done with
 */
export function spreadDailyLimits(base: number, totals: number[], finished: number): number[] {
  const n = totals.length
  const shifts = new Array<number>(n).fill(0)
  const limits = new Array<number>(n).fill(base)
  for (let i = 0; i < n; i++) {
    const limit = base + shifts[i]
    limits[i] = Math.max(limit, 0)
    const over = Math.max(totals[i] - limits[i], 0) + Math.max(-limit, 0)
    const under = i < finished ? Math.max(limits[i] - totals[i], 0) : 0
    const carry = under - over
    const rest = n - 1 - i
    if (carry !== 0 && rest > 0) for (let j = i + 1; j < n; j++) shifts[j] += carry / rest
  }
  return limits
}
