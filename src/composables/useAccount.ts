import { nextTick, readonly, ref, watch } from 'vue'
import { Capacitor } from '@capacitor/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import { loadJson, saveJson } from '../lib/storage'
import { useExpensesStore, type Expense } from '../stores/expenses'
import { useIncomeStore } from '../stores/income'
import { useRewardsStore } from '../stores/rewards'
import { useSettingsStore } from '../stores/settings'
import { useSubscriptionsStore } from '../stores/subscriptions'
import type { IncomeSource } from '../lib/income'
import type { AzkarRound, Earned, Reward, RewardSource } from '../lib/rewards'
import type { Subscription } from '../lib/subscriptions'
import type { Local, Remote } from '../lib/sync'

// Optional account: signing in with Google or Apple (through Supabase) backs up and syncs this
// device's expenses, subscriptions, income, rewards and settings. Without one the app works exactly
// as before, data on the device only. Signed in, it also reads Azkar Tracker's and Workout Tracker's
// rows on the same account to pay their rewards.

export type Provider = 'google' | 'apple'
export type SyncState = 'idle' | 'syncing' | 'error'

// The publishable key is meant to ship in the app; row-level security keeps each person to their
// own rows. Override with VITE_SUPABASE_URL / VITE_SUPABASE_KEY at build time, or set the URL to
// an empty string to turn accounts off.
const URL_ = import.meta.env.VITE_SUPABASE_URL ?? 'https://lgbtzvvgaemlpnuktssx.supabase.co'
const KEY = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_yatAKSTGeF_d9I0CoTyB_g_iAgC8FMf'
const TABLE = 'money_records'
const AZKAR_TABLE = 'azkar_records'
const WORKOUT_TABLE = 'records'

// The iPhone app gets the sign-in result back on this URL (CFBundleURLTypes in ios/App/App/Info.plist).
const NATIVE_REDIRECT = 'com.redaawad.moneytracker://auth-callback'
const SYNCED = 'syncState' // agreed hash per "<kind>:<uid>" from the last sync
const LAST_SYNC = 'lastSync'

const user = ref<{ id: string; email?: string; provider?: string } | null>(null)
const providers = ref<Provider[] | null>(null) // null until the project's settings load
const state = ref<SyncState>('idle')
const error = ref('')
const lastSync = ref<number | null>(null)
const busy = ref(false) // signing in
const offline = ref(false) // couldn't reach Supabase to see which sign-in options exist

let client: SupabaseClient | null = null
let started = false
let running: Promise<void> | null = null
let again = false
let timer: ReturnType<typeof setTimeout> | undefined

const native = () => Capacitor.isNativePlatform()

async function getClient() {
  if (client) return client
  const { createClient } = await import('@supabase/supabase-js')
  client = createClient(URL_, KEY, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: !native() },
  })
  return client
}

// Only offer the sign-in options turned on in the Supabase project.
async function loadProviders() {
  try {
    const res = await fetch(`${URL_}/auth/v1/settings`, { headers: { apikey: KEY } })
    const ext = (await res.json())?.external ?? {}
    providers.value = (['apple', 'google'] as Provider[]).filter((p) => ext[p])
    offline.value = false
  } catch {
    offline.value = true
  }
}

async function pullAll(c: SupabaseClient): Promise<Remote[]> {
  const rows: Remote[] = []
  const page = 1000
  for (let from = 0; ; from += page) {
    const { data, error } = await c
      .from(TABLE)
      .select('kind, uid, data, deleted')
      .order('kind')
      .order('uid')
      .range(from, from + page - 1)
    if (error) throw error
    rows.push(...(data as Remote[]))
    if (data.length < page) return rows
  }
}

// Every live row of one kind in another app's table, a page at a time.
async function pullKind(c: SupabaseClient, table: string, kind: string, columns: string) {
  const rows: Record<string, any>[] = []
  const page = 1000
  for (let from = 0; ; from += page) {
    const { data, error } = await c
      .from(table)
      .select(columns)
      .eq('kind', kind)
      .eq('deleted', false)
      .order('uid')
      .range(from, from + page - 1)
    if (error) throw error
    rows.push(...(data as unknown as Record<string, any>[]))
    if (data.length < page) return rows
  }
}

// What each of the other apps has earned so far. An app that can't be read this time (offline, or
// its table isn't there) is left out, so its rewards stay as they are.
async function readEarned(c: SupabaseClient) {
  const { azkarEarned, workoutEarned } = await import('../lib/rewards')
  const earned: Partial<Record<RewardSource, Earned[]>> = {}
  const [azkar, workout] = await Promise.allSettled([
    pullKind(c, AZKAR_TABLE, 'rounds', 'uid, data'),
    pullKind(c, WORKOUT_TABLE, 'entries', 'date:data->>date, source:data->>source'),
  ])
  if (azkar.status === 'fulfilled') {
    earned.azkar = azkarEarned(azkar.value.filter((r) => r.data?.date).map((r) => ({ ...r.data, uid: r.uid }) as AzkarRound))
  }
  if (workout.status === 'fulfilled') {
    earned.workout = workoutEarned(workout.value.filter((r) => r.source === 'logged' && r.date).map((r) => r.date as string))
  }
  return earned
}

const withoutId = <T extends { id: string }>({ id, ...rest }: T) => rest

async function syncOnce(c: SupabaseClient, userId: string) {
  const { plan, applyOps } = await import('../lib/sync')
  const { reconcileRewards } = await import('../lib/rewards')
  const [remote, earned] = await Promise.all([pullAll(c), readEarned(c)])
  const synced = await loadJson<Record<string, string>>(SYNCED, {})

  // From here to the end of the store updates nothing awaits, so no edit can slip in between.
  const expenses = useExpensesStore()
  const subs = useSubscriptionsStore()
  const income = useIncomeStore()
  const rewards = useRewardsStore()
  const { settings } = useSettingsStore()

  // Rewards another device already paid keep their amount; then add what's newly earned.
  const known = new Map<string, Reward>()
  for (const r of remote) if (r.kind === 'rewards' && !r.deleted) known.set(r.uid, { ...(r.data as Omit<Reward, 'id'>), id: r.uid })
  for (const r of rewards.rewards) known.set(r.id, r)
  const nextRewards = reconcileRewards([...known.values()], earned, { azkar: settings.azkarReward, workout: settings.workoutReward })
  if (JSON.stringify(nextRewards) !== JSON.stringify(rewards.rewards)) rewards.rewards = nextRewards

  const local: Local[] = [
    ...expenses.expenses.map((e) => ({ kind: 'expenses' as const, uid: e.id, data: withoutId(e) })),
    ...subs.subscriptions.map((s) => ({ kind: 'subscriptions' as const, uid: s.id, data: withoutId(s) })),
    ...income.sources.map((s) => ({ kind: 'income' as const, uid: s.id, data: withoutId(s) })),
    ...rewards.rewards.map((r) => ({ kind: 'rewards' as const, uid: r.id, data: withoutId(r) })),
    { kind: 'settings', uid: 'settings', data: { ...settings } },
  ]
  const p = plan(local, remote, synced)

  const nextExpenses = applyOps<Expense>(expenses.expenses, 'expenses', p.ops)
  if (nextExpenses) expenses.expenses = nextExpenses
  const nextSubs = applyOps<Subscription>(subs.subscriptions, 'subscriptions', p.ops)
  if (nextSubs) subs.subscriptions = nextSubs
  const nextIncome = applyOps<IncomeSource>(income.sources, 'income', p.ops)
  if (nextIncome) income.sources = nextIncome
  const nextPaid = applyOps<Reward>(rewards.rewards, 'rewards', p.ops)
  if (nextPaid) rewards.rewards = nextPaid
  const s = p.ops.find((o) => o.kind === 'settings' && o.op === 'put')
  if (s?.op === 'put') Object.assign(settings, s.data)

  // Records about to be uploaded are marked agreed only once the upload succeeds.
  const pending = new Set(p.push.map((r) => `${r.kind}:${r.uid}`))
  const agreed: Record<string, string> = {}
  const afterUpload: Record<string, string> = {}
  for (const [id, h] of Object.entries(p.synced)) {
    if (pending.has(id)) {
      // Keep the old agreed version until the upload lands, so a failed upload isn't a conflict.
      if (synced[id]) agreed[id] = synced[id]
      if (h !== null) afterUpload[id] = h
    } else if (h !== null) agreed[id] = h
  }
  const save = async (next: Record<string, string>) => {
    if (JSON.stringify(next) !== JSON.stringify(synced)) await saveJson(SYNCED, next)
  }
  await save(agreed)

  for (let i = 0; i < p.push.length; i += 500) {
    const chunk = p.push.slice(i, i + 500).map((r) => ({ ...r, user_id: userId }))
    const { error } = await c.from(TABLE).upsert(chunk, { onConflict: 'user_id,kind,uid' })
    if (error) throw error
  }
  if (p.push.length) {
    const done = { ...agreed, ...afterUpload }
    for (const r of p.push) if (r.deleted) delete done[`${r.kind}:${r.uid}`]
    await saveJson(SYNCED, done)
  }
}

async function runSync() {
  if (!client || !user.value) return
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    state.value = 'syncing'
    error.value = ''
    try {
      await syncOnce(client!, user.value!.id)
      lastSync.value = Date.now()
      void saveJson(LAST_SYNC, lastSync.value)
      state.value = 'idle'
    } catch (e: any) {
      state.value = 'error'
      error.value = navigator.onLine ? e?.message || 'Sync failed' : 'Offline. Will sync when you are back online.'
    } finally {
      // Let the store watchers see this sync's own changes while they are still ignored.
      await nextTick()
      running = null
    }
  })()
  await running
  if (again) {
    again = false
    await runSync()
  }
}

// Sync a few seconds after the last change, so a burst of edits uploads once.
function schedule(delay = 4000) {
  if (!user.value) return
  clearTimeout(timer)
  timer = setTimeout(runSync, delay)
}

async function onNativeUrl(url: string) {
  if (!url.startsWith(NATIVE_REDIRECT)) return
  const { Browser } = await import('@capacitor/browser')
  Browser.close().catch(() => {})
  const params = new URL(url.replace(NATIVE_REDIRECT, 'https://x/')).searchParams
  const code = params.get('code')
  busy.value = false
  if (!code) {
    error.value = params.get('error_description') || 'Sign-in was cancelled.'
    return
  }
  const { error: e } = await (await getClient()).auth.exchangeCodeForSession(code)
  if (e) error.value = e.message
}

// Called once the stores have loaded their saved data, so a first sync never sees empty stores.
async function start() {
  if (started || !URL_) return
  started = true
  const saved = await loadJson<number | null>(LAST_SYNC, null)
  if (saved) lastSync.value = saved
  void loadProviders()

  const c = await getClient()
  c.auth.onAuthStateChange((event, session) => {
    const u = session?.user
    user.value = u ? { id: u.id, email: u.email, provider: u.app_metadata?.provider } : null
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      // Drop ?code=… left over from the web sign-in redirect.
      if (u && location.search.includes('code=')) history.replaceState(history.state, '', location.pathname + location.hash)
      if (u) setTimeout(runSync, 0)
    }
  })

  if (native()) {
    const { App } = await import('@capacitor/app')
    App.addListener('appUrlOpen', ({ url }) => onNativeUrl(url))
    App.addListener('resume', () => schedule(500))
  } else {
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && schedule(500))
  }
  window.addEventListener('online', () => {
    if (offline.value) void loadProviders()
    schedule(500)
  })

  // Changes made by a sync itself are not edits to upload; otherwise each sync would schedule the next.
  const expenses = useExpensesStore()
  const subs = useSubscriptionsStore()
  const income = useIncomeStore()
  const rewards = useRewardsStore()
  const { settings } = useSettingsStore()
  watch(
    () => [expenses.expenses, subs.subscriptions, income.sources, rewards.rewards, settings],
    () => {
      if (!running) schedule()
    },
    { deep: true },
  )
}

async function signIn(provider: Provider) {
  error.value = ''
  busy.value = true
  const c = await getClient()
  if (native()) {
    // Google refuses sign-in inside an app's web view, so it opens in Safari's sheet and
    // comes back on the app's URL scheme.
    const { data, error: e } = await c.auth.signInWithOAuth({
      provider,
      options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true },
    })
    if (e || !data.url) {
      error.value = e?.message || 'Could not start sign-in.'
      busy.value = false
      return
    }
    const { Browser } = await import('@capacitor/browser')
    const done = await Browser.addListener('browserFinished', () => {
      busy.value = false
      void done.remove()
    })
    await Browser.open({ url: data.url, presentationStyle: 'popover' })
  } else {
    const { error: e } = await c.auth.signInWithOAuth({ provider, options: { redirectTo: `${location.origin}${location.pathname}` } })
    if (e) {
      error.value = e.message
      busy.value = false
    }
  }
}

// Signing out keeps everything on this device; it only stops syncing.
async function signOut() {
  clearTimeout(timer)
  await client?.auth.signOut()
  user.value = null
  state.value = 'idle'
  // Forget the agreed versions so signing in again (to any account) merges instead of deleting.
  await saveJson(SYNCED, {})
}

export function useAccount() {
  return {
    enabled: !!URL_,
    user: readonly(user),
    providers: readonly(providers),
    state: readonly(state),
    error: readonly(error),
    lastSync: readonly(lastSync),
    busy: readonly(busy),
    offline: readonly(offline),
    start,
    signIn,
    signOut,
    syncNow: runSync,
  }
}
