import { readonly, ref, watch } from 'vue'
import { Capacitor } from '@capacitor/core'
import { formatMoney } from '../lib/money'
import { upcomingReminders } from '../lib/reminders'
import { useSettingsStore } from '../stores/settings'
import { useSubscriptionsStore } from '../stores/subscriptions'

// Schedules the phone's local notifications for bill reminders. The whole schedule is replaced
// whenever subscriptions, paid dates or the setting change, and again when the app comes back,
// so it always reaches the next few months. In the browser there are no notifications; the
// "Due soon" card on Overview covers it.

const available = Capacitor.isNativePlatform()
const denied = ref(false)

let started = false
let timer: ReturnType<typeof setTimeout> | undefined

async function plugin() {
  return (await import('@capacitor/local-notifications')).LocalNotifications
}

/** Asks for permission if it hasn't been asked yet. False when the user said no. */
async function allow(): Promise<boolean> {
  if (!available) return false
  const ln = await plugin()
  let { display } = await ln.checkPermissions()
  if (display === 'prompt' || display === 'prompt-with-rationale') ({ display } = await ln.requestPermissions())
  denied.value = display !== 'granted'
  return !denied.value
}

async function reschedule() {
  if (!available) return
  const { settings } = useSettingsStore()
  const subs = useSubscriptionsStore()
  const ln = await plugin()
  const { notifications: pending } = await ln.getPending()
  const ours = pending.filter((n) => n.extra?.kind === 'bill')
  if (ours.length) await ln.cancel({ notifications: ours.map((n) => ({ id: n.id })) })
  if (!settings.billReminders || !(await allow())) return
  const list = upcomingReminders(subs.subscriptions, new Date(), settings.billReminderDays, (n) => formatMoney(n, settings.currency))
  if (!list.length) return
  await ln.schedule({
    notifications: list.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      schedule: { at: r.at, allowWhileIdle: true },
      extra: { kind: 'bill', subId: r.subId, dueDate: r.dueDate, route: '/fixed' },
    })),
  })
}

function schedule() {
  clearTimeout(timer)
  timer = setTimeout(() => void reschedule().catch(() => {}), 1000)
}

// Called once the stores have loaded.
async function start(openRoute: (path: string) => void) {
  if (started || !available) return
  started = true
  const { settings } = useSettingsStore()
  const subs = useSubscriptionsStore()
  watch(() => [subs.subscriptions, settings.billReminders, settings.billReminderDays, settings.currency], schedule, { deep: true })
  const { App } = await import('@capacitor/app')
  App.addListener('resume', schedule)
  const ln = await plugin()
  ln.addListener('localNotificationActionPerformed', ({ notification }) => {
    const route = notification.extra?.route
    if (typeof route === 'string') openRoute(route)
  })
  schedule()
}

export function useBillReminders() {
  return { available, denied: readonly(denied), start, allow, reschedule }
}
