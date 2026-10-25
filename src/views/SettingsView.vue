<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import { useAccount, type Provider } from '../composables/useAccount'
import { CURRENCIES } from '../lib/money'
import { useSettingsStore } from '../stores/settings'

const { settings } = useSettingsStore()
const account = useAccount()
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
      <label class="check">
        <input v-model="settings.includeSubscriptionsInBudget" type="checkbox" />
        Count fixed subscriptions in the monthly budget
      </label>
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
.header { min-height: 48px; display: flex; align-items: center; }
.title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
.brand { display: flex; align-items: center; gap: 14px; }
.brand-logo { border-radius: 14px; }
.brand-text { display: flex; flex-direction: column; gap: 2px; }
.brand-name { font-size: 17px; font-weight: 800; }
.brand-sub { font-size: 13px; font-weight: 600; }
.fields { display: flex; flex-direction: column; gap: 16px; }
.check { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; min-height: 44px; }
.check input { width: 20px; height: 20px; accent-color: var(--accent); }
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
