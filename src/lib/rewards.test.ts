import { describe, expect, it } from 'vitest'
import { azkarEarned, reconcileRewards, workoutEarned, type Reward } from './rewards'

const days = (n: number, from = 1) => Array.from({ length: n }, (_, i) => `2026-0${1 + Math.floor((from + i - 1) / 28)}-${String(((from + i - 1) % 28) + 1).padStart(2, '0')}`)
const amounts = { azkar: 10, workout: 100 }

describe('rewards', () => {
  it('pays every 30th distinct workout day, rest days and repeats don\'t matter', () => {
    expect(workoutEarned(days(29))).toEqual([])
    const d = days(61)
    const earned = workoutEarned([...d, d[0], d[5]])
    expect(earned.map((e) => [e.id, e.date])).toEqual([['workout:30', d[29]], ['workout:60', d[59]]])
  })

  it('pays one per azkar round', () => {
    expect(azkarEarned([{ uid: 'a', date: '2026-10-25', name: 'سبحان الله' }])).toEqual([
      { id: 'azkar:a', source: 'azkar', date: '2026-10-25', label: '1,000 × سبحان الله' },
    ])
  })

  it('keeps paid amounts, adds new ones at the current amount and drops undone ones', () => {
    const paid: Reward = { id: 'azkar:a', source: 'azkar', date: '2026-10-01', amount: 5, label: 'x' }
    const gone: Reward = { id: 'azkar:b', source: 'azkar', date: '2026-10-02', amount: 5, label: 'y' }
    const earned = azkarEarned([{ uid: 'a', date: '2026-10-01' }, { uid: 'c', date: '2026-10-03' }])
    const out = reconcileRewards([paid, gone], { azkar: earned }, amounts)
    expect(out.map((r) => [r.id, r.amount])).toEqual([['azkar:a', 5], ['azkar:c', 10]])
  })

  it('leaves a source alone when it could not be read, and pays nothing at amount 0', () => {
    const w: Reward = { id: 'workout:30', source: 'workout', date: '2026-02-02', amount: 100, label: 'x' }
    expect(reconcileRewards([w], {}, amounts)).toEqual([w])
    expect(reconcileRewards([], { workout: workoutEarned(days(30)) }, { azkar: 10, workout: 0 })).toEqual([])
  })
})
