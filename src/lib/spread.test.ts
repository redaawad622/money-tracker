import { describe, expect, it } from 'vitest'
import { spreadDailyLimits } from './spread'

const round = (values: number[]) => values.map((v) => Math.round(v * 100) / 100)

describe('spreadDailyLimits', () => {
  it('keeps the base limit when nobody overspends', () => {
    expect(spreadDailyLimits(50, [10, 50, 0, 0])).toEqual([50, 50, 50, 50])
  })

  it('splits one day of overspending evenly over the days after it', () => {
    // 30 over on day 1, three days left: 10 off each
    expect(round(spreadDailyLimits(50, [80, 0, 0, 0]))).toEqual([50, 40, 40, 40])
  })

  it('measures overspending against the lowered limit', () => {
    // Day 2's limit is 40 after day 1, so spending 52 there is 12 over, 6 off each of the last two days
    expect(round(spreadDailyLimits(50, [80, 52, 0, 0]))).toEqual([50, 40, 34, 34])
  })

  it('never goes below zero', () => {
    expect(round(spreadDailyLimits(50, [200, 0, 0, 0]))).toEqual([50, 0, 0, 0])
    expect(round(spreadDailyLimits(50, [400, 0, 0, 0]))).toEqual([50, 0, 0, 0])
  })

  it('takes off exactly what was overspent while there is room', () => {
    const totals = [70, 0, 95, 10, 0, 0, 0, 0, 0, 0]
    const limits = spreadDailyLimits(40, totals)
    const over = limits.reduce((sum, limit, i) => sum + Math.max(totals[i] - limit, 0), 0)
    const lastOver = Math.max(totals[9] - limits[9], 0)
    const cut = 40 * 10 - limits.reduce((a, b) => a + b, 0)
    expect(cut).toBeCloseTo(over - lastOver)
  })

  it('ignores overspending on the last day', () => {
    expect(spreadDailyLimits(50, [0, 0, 500])).toEqual([50, 50, 50])
  })
})
