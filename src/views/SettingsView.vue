<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import ToggleSwitch from '../components/ToggleSwitch.vue'
import { useAccount, type Provider } from '../composables/useAccount'
import { useAppLock } from '../composables/useAppLock'
import { useBillReminders } from '../composables/useBillReminders'
import { useIncomeLock } from '../composables/useIncomeLock'
import { categoryById } from '../data/categories'
import { todayYmd } from '../lib/dates'
import { backupJson, expensesCsv } from '../lib/export'
import { CURRENCIES } from '../lib/money'
import { saveTextFile } from '../lib/saveFile'
import { useCategoriesStore } from '../stores/categories'
import { useExpensesStore } from '../stores/expenses'
import { useIncomeStore } from '../stores/income'
import { useRewardsStore } from '../stores/rewards'
import { useSettingsStore } from '../stores/settings'
import { useSubscriptionsStore } from '../stores/subscriptions'

const { settings } = useSettingsStore()
const account = useAccount()
const lock = useAppLock()
const income = useIncomeLock()
const current = shallowRef('')
const next = shallowRef('')
const confirm = shallowRef('')
const pwMessage = shallowRef('')
const pwError = shallowRef(false)
const pwBusy = shallowRef(false)
const MIN = 4

function pwDone(message: string, error = false) {
  pwMessage.value = message
  pwError.value = error
  pwBusy.value = false
}

async function savePassword() {
  if (pwBusy.value) return
  pwBusy.value = true
  if (income.stored.value && !(await income.unlock(current.value))) return pwDone('Current password is wrong.', true)
  if (next.value.length < MIN) return pwDone(`Use at least ${MIN} characters.`, true)
  if (next.value !== confirm.value) return pwDone("The new passwords don't match.", true)
  const changed = !!income.stored.value
  await income.setPassword(next.value)
  current.value = next.value = confirm.value = ''
  pwDone(changed ? 'Password changed.' : 'Income is now locked with a password.')
}

async function removePassword() {
  if (pwBusy.value) return
  pwBusy.value = true
  if (!(await income.unlock(current.value))) return pwDone('Current password is wrong.', true)
  await income.removePassword()
  current.value = next.value = confirm.value = ''
  pwDone('Password removed.')
}

const reminders = useBillReminders()
const REMINDER_DAYS = [
  { value: 0, label: 'On the day' },
  { value: 1, label: '1 day before' },
  { value: 2, label: '2 days before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: 'A week before' },
]
const WARNING_PERCENTS = [
  { value: 0, label: 'Off' },
  { value: 70, label: 'At 70% spent' },
  { value: 80, label: 'At 80% spent' },
  { value: 90, label: 'At 90% spent' },
]
const remindersOn = computed({
  get: () => settings.billReminders,
  set: (v: boolean) => void setReminders(v),
})
async function setReminders(on: boolean) {
  if (on && !(await reminders.allow())) return
  settings.billReminders = on
}

const expenses = useExpensesStore()
const exportPassword = shallowRef('')
const exportMessage = shallowRef('')
const exportError = shallowRef(false)
const backupNeedsPassword = computed(() => !!income.stored.value && !income.unlocked.value)

async function exportFile(make: () => Promise<[string, string, string]>) {
  exportMessage.value = ''
  exportError.value = false
  try {
    const [name, text, mime] = await make()
    await saveTextFile(name, text, mime)
  } catch (e: any) {
    exportError.value = true
    exportMessage.value = e?.message || 'Could not export.'
  }
}

function exportCsv() {
  // The byte-order mark lets Excel read Arabic and other non-Latin notes correctly.
  return exportFile(async () => [`money-tracker-expenses-${todayYmd()}.csv`, '\uFEFF' + expensesCsv(expenses.expenses, categoryById), 'text/csv'])
}

async function exportBackup() {
  const relock = backupNeedsPassword.value
  if (relock && !(await income.unlock(exportPassword.value))) {
    exportError.value = true
    exportMessage.value = 'Income password is wrong.'
    return
  }
  // Checking the password for the backup shouldn't leave the Income screen open.
  if (relock) income.lock()
  exportPassword.value = ''
  await exportFile(async () => {
    const data = {
      settings: { ...settings },
      expenses: expenses.expenses,
      subscriptions: useSubscriptionsStore().subscriptions,
      income: useIncomeStore().sources,
      rewards: useRewardsStore().rewards,
      categories: useCategoriesStore().edits,
    }
    return [`money-tracker-backup-${todayYmd()}.json`, backupJson(data), 'application/json']
  })
}

const lockOn = computed({ get: () => lock.enabled.value, set: (v: boolean) => void lock.setEnabled(v) })
const showAccount = computed(() => account.enabled && (!!account.user.value || !!account.providers.value?.length || account.offline.value))
const PROVIDER_NAMES: Record<Provider, string> = { apple: 'Apple', google: 'Google' }

const lastSyncLabel = computed(() => {
  const t = account.lastSync.value
  if (!t) return 'Not synced yet'
  const mins = Math.round((Date.now() - t) / 60_000)
  if (mins < 1) return 'Synced just now'
  if (mins < 60) return `Synced ${mins} min ago`
  return `Synced ${new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
})
const logoUrl = `${import.meta.env.BASE_URL}logo.svg`
</script>

<template>
  <main class="page">
    <header class="header">
      <RouterLink to="/" class="icon-btn icon-btn--plain" aria-label="Back to overview"><AppIcon name="back" /></RouterLink>
      <h1 class="title">Settings</h1>
    </header>
    <section class="brand">
      <img :src="logoUrl" alt="" class="brand-logo" width="56" height="56" />
      <div class="brand-text">
        <span class="brand-name">Money Tracker</span>
        <span class="muted brand-sub">Daily spending, month by month</span>
      </div>
    </section>
    <section class="card fields">
      <label class="field">
        Monthly budget
        <input v-model.number="settings.monthlyBudget" type="number" inputmode="decimal" min="0" step="50" />
      </label>
      <label class="field">
        Currency
        <select v-model="settings.currency">
          <option v-for="c in CURRENCIES" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
      <label class="field">
        Budget warning on Overview
        <select v-model.number="settings.budgetWarningPercent">
          <option v-for="w in WARNING_PERCENTS" :key="w.value" :value="w.value">{{ w.label }}</option>
        </select>
      </label>
      <label class="check">
        <input v-model="settings.includeSubscriptionsInBudget" type="checkbox" />
        Count fixed subscriptions in the monthly budget
      </label>
      <div class="option">
        <label class="check">
          <input v-model="settings.spreadDailyDifference" type="checkbox" />
          Spread each day's difference over the coming days
        </label>
        <span class="muted hint">When a day goes over its daily budget, the extra is split evenly across the days left in the month and taken off their budgets. When a day ends under budget, what's left is split the same way and added to them.</span>
      </div>
    </section>
    <RouterLink to="/categories" class="card link-row">
      <span class="link-text">
        <span class="lock-title">Categories</span>
        <span class="muted reward-hint">Add your own, rename, change icons or hide ones you don't use.</span>
      </span>
      <AppIcon name="forward" :size="18" class="link-go" />
    </RouterLink>
    <section v-if="reminders.available" class="card fields">
      <div class="lock">
        <div class="lock-text">
          <span class="lock-title">Bill reminders</span>
          <span class="muted reward-hint">A notification at 9:00 before each unpaid fixed subscription is due.</span>
        </div>
        <ToggleSwitch v-model="remindersOn" label="Bill reminders" />
      </div>
      <label v-if="settings.billReminders" class="field">
        Remind me
        <select v-model.number="settings.billReminderDays">
          <option v-for="d in REMINDER_DAYS" :key="d.value" :value="d.value">{{ d.label }}</option>
        </select>
      </label>
      <p v-if="reminders.denied.value" role="alert" class="pw-message pw-message--error">
        Notifications are off for Money Tracker. Turn them on in the iPhone's Settings › Notifications, then try again.
      </p>
    </section>
    <section v-if="lock.available.value" class="card lock">
      <div class="lock-text">
        <span class="lock-title">Lock with {{ lock.kind.value }}</span>
        <span class="muted reward-hint">Asks on opening the app and on coming back to it. Your passcode works if {{ lock.kind.value }} doesn't. Set on this phone only.</span>
      </div>
      <ToggleSwitch v-model="lockOn" :label="`Lock with ${lock.kind.value}`" />
    </section>
    <form class="card fields" @submit.prevent="savePassword">
      <div class="option">
        <span class="section-title">Income password</span>
        <span class="muted reward-hint">Asks each time you open Income. Set on this device only.</span>
      </div>
      <label v-if="income.stored.value" class="field">
        Current password
        <input v-model="current" type="password" autocomplete="current-password" />
      </label>
      <label class="field">
        {{ income.stored.value ? 'New password' : 'Password' }}
        <input v-model="next" type="password" autocomplete="new-password" :minlength="MIN" />
      </label>
      <label class="field">
        Confirm password
        <input v-model="confirm" type="password" autocomplete="new-password" />
      </label>
      <p v-if="pwMessage" role="status" class="pw-message" :class="{ 'pw-message--error': pwError }">{{ pwMessage }}</p>
      <div class="account-actions">
        <button type="submit" class="secondary-btn" :disabled="pwBusy || !next">{{ income.stored.value ? 'Change' : 'Set password' }}</button>
        <button v-if="income.stored.value" type="button" class="secondary-btn" :disabled="pwBusy || !current" @click="removePassword">Remove</button>
      </div>
    </form>
    <section class="card fields">
      <div class="option">
        <span class="section-title">Rewards</span>
        <span class="muted reward-hint">Paid into a reward pot, kept apart from the monthly budget. Sign in with the same account in Azkar Tracker and Workout Tracker. Set 0 to turn one off.</span>
      </div>
      <label class="field">
        Each 1,000-round in Azkar
        <input v-model.number="settings.azkarReward" type="number" inputmode="decimal" min="0" step="5" />
      </label>
      <label class="field">
        Every 30 workout days
        <input v-model.number="settings.workoutReward" type="number" inputmode="decimal" min="0" step="10" />
      </label>
    </section>
    <section class="card fields">
      <div class="option">
        <span class="section-title">Export your data</span>
        <span class="muted reward-hint">Expenses as a spreadsheet, or everything (expenses, fixed, income, rewards, categories and settings) as a backup file.</span>
      </div>
      <label v-if="backupNeedsPassword" class="field">
        Income password (for the full backup)
        <input v-model="exportPassword" type="password" autocomplete="current-password" />
      </label>
      <p v-if="exportMessage" role="status" class="pw-message" :class="{ 'pw-message--error': exportError }">{{ exportMessage }}</p>
      <div class="account-actions">
        <button type="button" class="secondary-btn" :disabled="!expenses.expenses.length" @click="exportCsv">
          <AppIcon name="down" :size="18" />Expenses CSV
        </button>
        <button type="button" class="secondary-btn" :disabled="backupNeedsPassword && !exportPassword" @click="exportBackup">
          <AppIcon name="down" :size="18" />Full backup
        </button>
      </div>
    </section>
    <section v-if="showAccount" class="card account">
      <template v-if="account.user.value">
        <div class="account-row">
          <span class="account-avatar">{{ (account.user.value.email?.[0] ?? '?').toUpperCase() }}</span>
          <div class="account-text">
            <span class="account-email">{{ account.user.value.email ?? 'Signed in' }}</span>
            <span class="muted account-status" :class="{ 'account-status--error': account.state.value === 'error' }">
              <template v-if="account.state.value === 'syncing'">Syncing…</template>
              <template v-else-if="account.state.value === 'error'">{{ account.error.value }}</template>
              <template v-else>{{ lastSyncLabel }}</template>
            </span>
          </div>
        </div>
        <div class="account-actions">
          <button type="button" class="secondary-btn" :disabled="account.state.value === 'syncing'" @click="account.syncNow()">
            <AppIcon name="repeat" :size="18" />Sync now
          </button>
          <button type="button" class="secondary-btn" @click="account.signOut()">Sign out</button>
        </div>
      </template>
      <template v-else>
        <span class="section-title">Back up and sync</span>
        <span class="muted account-hint">Sign in to keep your expenses safe and use them on another device.</span>
        <button
          v-for="p in account.providers.value"
          :key="p"
          type="button"
          class="secondary-btn"
          :disabled="account.busy.value"
          @click="account.signIn(p)"
        >
          Continue with {{ PROVIDER_NAMES[p] }}
        </button>
        <p v-if="account.offline.value" class="muted account-hint">You're offline. Sign-in needs a connection.</p>
        <p v-if="account.error.value" role="alert" class="account-error">{{ account.error.value }}</p>
        <span class="muted account-hint">Signing in uploads this phone's data and merges it with your account. Nothing here is deleted.</span>
      </template>
    </section>
    <p class="muted note">{{ account.user.value ? 'Your data is saved on this device and synced to your account.' : 'Your data is saved on this device only.' }}</p>
  </main>
</template>

<style scoped>
.header { min-height: 48px; display: flex; align-items: center; gap: 4px; margin-left: -10px; }
.title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
.brand { display: flex; align-items: center; gap: 14px; }
.brand-logo { border-radius: 14px; }
.brand-text { display: flex; flex-direction: column; gap: 2px; }
.brand-name { font-size: 17px; font-weight: 800; }
.brand-sub { font-size: 13px; font-weight: 600; }
.fields { display: flex; flex-direction: column; gap: 16px; }
.check { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; min-height: 44px; }
.check input { width: 20px; height: 20px; accent-color: var(--accent); }
.option { display: flex; flex-direction: column; gap: 2px; }
.hint { font-size: 12px; font-weight: 500; line-height: 1.45; padding-left: 30px; }
.lock { display: flex; align-items: center; gap: 12px; }
.link-row { display: flex; align-items: center; gap: 12px; }
.link-text { flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.link-go { color: var(--muted); flex: 0 0 auto; }
.lock-text { flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.lock-title { font-size: 14px; font-weight: 700; }
.pw-message { font-size: 13px; font-weight: 600; color: var(--accent-ink); }
.pw-message--error { color: var(--warn-ink); }
.reward-hint { font-size: 12px; font-weight: 500; line-height: 1.45; }
.note { font-size: 13px; font-weight: 500; text-align: center; }
.account { display: flex; flex-direction: column; gap: 12px; }
.account-row { display: flex; align-items: center; gap: 12px; }
.account-avatar {
  width: 44px; height: 44px; flex: 0 0 auto; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: var(--accent-soft); color: var(--accent-ink); font-size: 17px; font-weight: 800;
}
.account-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.account-email { font-size: 15px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.account-status { font-size: 13px; font-weight: 600; }
.account-status--error, .account-error { color: var(--warn-ink); }
.account-error { font-size: 13px; font-weight: 600; }
.account-hint { font-size: 13px; font-weight: 500; line-height: 1.45; }
.account-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.secondary-btn {
  height: 48px; width: 100%; border: 1px solid var(--line); border-radius: 16px; background: var(--card);
  color: var(--accent-ink); font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;
}
.secondary-btn:disabled { opacity: 0.5; cursor: default; }
</style>
