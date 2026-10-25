// Rewards earned in the other apps on the same account, paid into a pot kept apart from the monthly
// budget. Which rewards are earned is worked out from those apps' synced rows each sync:
// - Azkar Tracker: one per finished 1000-round of a dhikr (its "rounds" rows).
// - Workout Tracker: one per 30 days with a logged workout, in total; rest days don't reset it.
// A reward keeps the amount set when it was earned, so changing the amount later leaves past ones.

export type RewardSource = 'azkar' | 'workout'

export interface Reward {
  /** Same on every device for the same achievement, so it is never paid twice. */
  id: string
  source: RewardSource
  /** Local date it was earned, YYYY-MM-DD */
  date: string
  amount: number
  label: string
}

export interface AzkarRound {
  uid: string
  date: string
  name?: string
  n?: number
}

export type Earned = Omit<Reward, 'amount'>

export const WORKOUT_DAYS = 30
export const AZKAR_ROUND = 1000

export function azkarEarned(rounds: AzkarRound[]): Earned[] {
  return rounds.map((r) => ({
    id: `azkar:${r.uid}`,
    source: 'azkar' as const,
    date: r.date,
    label: `${AZKAR_ROUND.toLocaleString('en-US')} × ${r.name || 'dhikr'}`,
  }))
}

/** One reward on each 30th, 60th… distinct day with a logged workout. */
export function workoutEarned(dates: string[]): Earned[] {
  const days = [...new Set(dates)].sort()
  const out: Earned[] = []
  for (let n = WORKOUT_DAYS; n <= days.length; n += WORKOUT_DAYS) {
    out.push({ id: `workout:${n}`, source: 'workout', date: days[n - 1], label: `${n} workout days` })
  }
  return out
}

/**
 * The reward list after a sync. `known` holds the rewards this device or the cloud already has.
 * `earned` has an entry per source that could be read this time; a source left out (not reachable)
 * keeps its rewards as they are. A source's reward no longer earned (a round undone, a workout
 * deleted) is dropped, and a newly earned one is paid at the source's current amount, unless 0.
 */
export function reconcileRewards(
  known: Reward[],
  earned: Partial<Record<RewardSource, Earned[]>>,
  amounts: Record<RewardSource, number>,
): Reward[] {
  const byId = new Map(known.map((r) => [r.id, r]))
  const out = known.filter((r) => !earned[r.source] || earned[r.source]!.some((e) => e.id === r.id))
  for (const [source, list] of Object.entries(earned) as [RewardSource, Earned[]][]) {
    const amount = amounts[source]
    if (!(amount > 0)) continue
    for (const e of list) if (!byId.has(e.id)) out.push({ ...e, amount })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
}
