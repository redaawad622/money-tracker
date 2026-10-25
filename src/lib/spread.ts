/**
 * Daily limits for a month when overspending is spread over the days that follow.
 *
 * Every day starts at the same base limit. Whatever a day goes over its own limit is split evenly
 * across the remaining days of the month and taken off their limits. A limit never drops below
 * zero: any cut a day cannot absorb is passed on to the days after it, so the total taken off
 * always equals the total overspent. Overspending on the last day has nowhere to go.
 *
 * @param base the normal daily limit
 * @param totals what was spent on each day of the month, in order
 */
export function spreadDailyLimits(base: number, totals: number[]): number[] {
  const n = totals.length
  const cuts = new Array<number>(n).fill(0)
  const limits = new Array<number>(n).fill(base)
  for (let i = 0; i < n; i++) {
    const limit = base - cuts[i]
    limits[i] = Math.max(limit, 0)
    const carry = Math.max(totals[i] - limits[i], 0) + Math.max(-limit, 0)
    const rest = n - 1 - i
    if (carry > 0 && rest > 0) for (let j = i + 1; j < n; j++) cuts[j] += carry / rest
  }
  return limits
}
