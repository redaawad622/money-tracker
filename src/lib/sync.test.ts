import { describe, expect, it } from 'vitest'
import { applyOps, hash, plan, type Local, type Remote } from './sync'

const exp = (uid: string, amount: number): Local => ({ kind: 'expenses', uid, data: { amount, date: '2026-10-25' } })
const remoteOf = (l: Local, deleted = false): Remote => ({ kind: l.kind, uid: l.uid, data: deleted ? null : l.data, deleted })
const agreed = (...ls: Local[]) => Object.fromEntries(ls.map((l) => [`${l.kind}:${l.uid}`, hash(l.data)]))

describe('sync plan', () => {
  it('does nothing when both sides already agree', () => {
    const a = exp('a', 5)
    const p = plan([a], [remoteOf(a)], agreed(a))
    expect(p.ops).toEqual([])
    expect(p.push).toEqual([])
  })

  it('uploads new and edited local records, and never deletes what the cloud lacks', () => {
    const a = exp('a', 5)
    const p = plan([a], [], agreed(a))
    expect(p.ops).toEqual([])
    expect(p.push).toEqual([remoteOf(a)])
  })

  it('takes a change or deletion made on another device', () => {
    const a = exp('a', 5)
    const b = exp('b', 7)
    const p = plan([a, b], [remoteOf(exp('a', 9)), remoteOf(b, true)], agreed(a, b))
    expect(p.ops).toEqual([
      { op: 'put', kind: 'expenses', uid: 'a', data: { amount: 9, date: '2026-10-25' } },
      { op: 'delete', kind: 'expenses', uid: 'b' },
    ])
  })

  it('uploads a local deletion', () => {
    const a = exp('a', 5)
    const p = plan([], [remoteOf(a)], agreed(a))
    expect(p.push).toEqual([{ kind: 'expenses', uid: 'a', data: null, deleted: true }])
  })

  it('keeps both versions of an expense edited on two devices', () => {
    const base = exp('a', 5)
    const p = plan([exp('a', 6)], [remoteOf(exp('a', 8))], agreed(base))
    const next = applyOps([{ id: 'a', amount: 6, date: '2026-10-25' }], 'expenses', p.ops)!
    expect(next.map((e) => e.amount).sort()).toEqual([6, 8])
    expect(p.push).toHaveLength(1)
    expect(p.push[0].data).toEqual({ amount: 6, date: '2026-10-25' })
  })

  it('merges paid dates of a subscription edited on two devices', () => {
    const sub = (paid: string[], amount = 10): Local => ({ kind: 'subscriptions', uid: 's', data: { amount, paid } })
    const p = plan([sub(['2026-09-15'], 12)], [remoteOf(sub(['2026-10-15']))], agreed(sub([])))
    expect(p.ops).toEqual([{ op: 'put', kind: 'subscriptions', uid: 's', data: { amount: 12, paid: ['2026-09-15', '2026-10-15'] } }])
    expect(p.push[0].data).toEqual({ amount: 12, paid: ['2026-09-15', '2026-10-15'] })
  })
})
