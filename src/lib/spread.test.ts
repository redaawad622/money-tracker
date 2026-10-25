import { describe, expect, it } from 'vitest'
import { spreadDailyLimits } from './spread'

const round = (values: number[]) => values.map((v) => Math.round(v * 100) / 100)

describe('spreadDailyLimits', () => {
  it('keeps the base limit when every day spends exactly its limit', () => {
    expect(spreadDailyLimits(50, [50, 50, 50, 50], 4)).toEqual([50, 50, 50, 50])
  })

  it('splits one day of overspending evenly over the days after it', () => {
    // 30 over on day 1, three days left: 10 off each
    expect(round(spreadDailyLimits(50, [80, 0, 0, 0], 1))).toEqual([50, 40, 40, 40])
  })

  it('splits what a finished day left unspent over the days after it', () => {
    // 30 under on day 1, three days left: 10 added to each
    expect(round(spreadDailyLimits(50, [20, 0, 0, 0], 1))).toEqual([50, 60, 60, 60])
  })

  it('does not pass on what today or later days have not spent yet', () => {
    expect(spreadDailyLimits(50, [50, 10, 0, 0], 1)).toEqual([50, 50, 50, 50])
  })

  it('still takes today’s overspending off the days after it', () => {
    expect(round(spreadDailyLimits(50, [50, 80, 0, 0], 1))).toEqual([50, 50, 35, 35])
  })

  it('measures each day against its shifted limit', () => {
    // Day 2's limit is 40 after day 1, so spending 52 there is 12 over, 6 off each of the last two days
    expect(round(spreadDailyLimits(50, [80, 52, 0, 0], 2))).toEqual([50, 40, 34, 34])
    // Day 2's limit is 60 after day 1, so spending 40 there leaves 20, 10 more for each of the last two days
    expect(round(spreadDailyLimits(50, [20, 40, 0, 0], 2))).toEqual([50, 60, 70, 70])
  })

  it('never goes below zero', () => {
    expect(round(spreadDailyLimits(50, [200, 0, 0, 0], 1))).toEqual([50, 0, 0, 0])
    expect(round(spreadDailyLimits(50, [400, 0, 0, 0], 1))).toEqual([50, 0, 0, 0])
  })

  it('makes the last day’s limit whatever is left of the month', () => {
    const totals = [70, 0, 95, 10, 0, 33, 41, 0, 12, 0]
    const limits = spreadDailyLimits(40, totals, 9)
    const spentBefore = totals.slice(0, 9).reduce((a, b) => a + b, 0)
    expect(limits[9]).toBeCloseTo(40 * 10 - spentBefore)
  })

  it('ignores the difference on the last day', () => {
    expect(spreadDailyLimits(50, [50, 50, 500], 3)).toEqual([50, 50, 50])
    expect(spreadDailyLimits(50, [50, 50, 0], 3)).toEqual([50, 50, 50])
  })
})
