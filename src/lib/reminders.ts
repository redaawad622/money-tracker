import { t } from '../i18n'
import { daysBetween, parseYmd, toYmd } from './dates'
import { dueDatesBetween, type Subscription } from './subscriptions'

// Bill reminders: a notification some days before each unpaid due date of a fixed subscription.
// The schedule is rebuilt from scratch whenever subscriptions or the setting change.

export interface BillReminder {
  /** Same number for the same subscription and due date, so rescheduling replaces rather than repeats. */
  id: number
  subId: string
  dueDate: string
  at: Date
  title: string
  body: string
}

/** iOS keeps at most 64 pending notifications per app. */
export const MAX_REMINDERS = 60
export const REMINDER_HOUR = 9

export function reminderId(subId: string, dueDate: string): number {
  let h = 0
  for (const c of `${subId}:${dueDate}`) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0
  return (h & 0x7fffffff) || 1
}

export function whenDue(days: number): string {
  if (days <= 0) return t('today')
  if (days === 1) return t('tomorrow')
  return t('in {n} days', { n: days })
}

/** Unpaid due dates within the next horizon days, each with its reminder time, soonest first. */
export function upcomingReminders(
  subs: Subscription[],
  now: Date,
  daysBefore: number,
  formatAmount: (n: number) => string,
  horizonDays = 120,
): BillReminder[] {
  const today = toYmd(now)
  const end = new Date(now)
  end.setDate(end.getDate() + horizonDays)
  const out: BillReminder[] = []
  for (const sub of subs) {
    for (const due of dueDatesBetween(sub, today, toYmd(end))) {
      if (sub.paid.includes(due)) continue
      const at = parseYmd(due)
      at.setDate(at.getDate() - daysBefore)
      at.setHours(REMINDER_HOUR, 0, 0, 0)
      if (at <= now) continue
      const days = daysBetween(toYmd(at), due)
      out.push({
        id: reminderId(sub.id, due),
        subId: sub.id,
        dueDate: due,
        at,
        title: t('{name} is due {when}', { name: sub.name, when: whenDue(days) }),
        body: t("{amount}. Mark it paid in Fixed once it's done.", { amount: formatAmount(sub.amount) }),
      })
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_REMINDERS)
}

/** Unpaid due dates from today through the next days, for the "Due soon" card. */
export function dueSoon(subs: Subscription[], today: string, days: number) {
  const end = parseYmd(today)
  end.setDate(end.getDate() + days)
  return subs
    .flatMap((sub) => dueDatesBetween(sub, today, toYmd(end)).filter((d) => !sub.paid.includes(d)).map((date) => ({ sub, date })))
    .sort((a, b) => a.date.localeCompare(b.date))
}
