<script setup lang="ts">
import { t } from '../i18n'
import { computed } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import ExpenseRow from '../components/ExpenseRow.vue'
import { formatDay } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { useAccount } from '../composables/useAccount'
import { useExpensesStore } from '../stores/expenses'
import { useRewardsStore } from '../stores/rewards'
import { useSettingsStore } from '../stores/settings'

const rewards = useRewardsStore()
const expenses = useExpensesStore()
const { settings } = useSettingsStore()
const account = useAccount()

const money = (n: number) => formatMoney(n, settings.currency)
const list = computed(() => [...rewards.rewards].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)))
const paid = computed(() =>
  expenses.expenses.filter((e) => e.fromRewards).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
)
const off = computed(() => !(settings.azkarReward > 0) && !(settings.workoutReward > 0))
</script>

<template>
  <main class="page page--no-tabs">
    <header class="header">
      <RouterLink to="/" class="icon-btn icon-btn--plain" :aria-label="t('Back to overview')"><AppIcon name="back" /></RouterLink>
      <h1 class="title">{{ t('Rewards') }}</h1>
    </header>

    <section class="hero">
      <span class="hero-label">{{ t('In the reward pot') }}</span>
      <span class="hero-amount">{{ money(rewards.balance) }}</span>
      <div class="hero-stats">
        <div class="stat"><span class="stat-label">{{ t('Earned') }}</span><span class="stat-value">{{ money(rewards.earned) }}</span></div>
        <div class="stat"><span class="stat-label">{{ t('Spent') }}</span><span class="stat-value">{{ money(rewards.spent) }}</span></div>
      </div>
    </section>

    <p v-if="off" class="card empty">
      {{ t('Set a reward amount in') }} <RouterLink to="/settings" class="link">{{ t('Settings') }}</RouterLink> {{ t('to start earning from Azkar and Workout.') }}
    </p>
    <p v-else-if="!account.user.value" class="card empty">
      {{ t('Sign in with the same account here, in Azkar Tracker and in Workout Tracker to earn rewards.') }}
    </p>

    <section class="group">
      <h2 class="section-title">{{ t('Earned') }}</h2>
      <p v-if="list.length === 0" class="card empty">{{ t('Nothing yet. Finish a 1,000-round in Azkar or reach 30 workout days.') }}</p>
      <div v-else class="card rows">
        <div v-for="r in list" :key="r.id" class="row">
          <span class="icon" :class="`icon--${r.source}`"><AppIcon :name="r.source === 'azkar' ? 'beads' : 'dumbbell'" /></span>
          <span class="text">
            <span class="row-title">{{ r.label }}</span>
            <span class="row-sub">{{ r.source === 'azkar' ? t('Azkar') : t('Workout') }} · {{ formatDay(r.date) }}</span>
          </span>
          <span class="amount">+{{ money(r.amount) }}</span>
        </div>
      </div>
    </section>

    <section v-if="paid.length" class="group">
      <h2 class="section-title">{{ t('Paid from rewards') }}</h2>
      <div class="card rows">
        <ExpenseRow v-for="e in paid" :key="e.id" :expense="e" :currency="settings.currency" />
      </div>
    </section>
  </main>
</template>

<style scoped>
.header { min-height: 48px; display: flex; align-items: center; gap: 4px; margin-inline-start: -10px; }
.title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
.hero { background: var(--accent); color: #fff; border-radius: 24px; padding: 20px; display: flex; flex-direction: column; gap: 6px; }
.hero-label { font-size: 13px; font-weight: 600; opacity: 0.85; }
.hero-amount { font-size: 36px; font-weight: 800; letter-spacing: -0.03em; }
.hero-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 8px; }
.stat { background: rgba(255, 255, 255, 0.12); border-radius: 14px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
.stat-label { font-size: 12px; font-weight: 600; opacity: 0.85; }
.stat-value { font-size: 17px; font-weight: 700; }
.link { color: var(--accent); font-weight: 700; }
.group { display: flex; flex-direction: column; gap: 8px; }
.rows { padding: 4px 14px; }
.row { display: flex; align-items: center; gap: 12px; padding: 12px 0; min-height: 44px; }
.row + .row { border-top: 1px solid var(--line-soft); }
.icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; background: var(--accent-soft); color: var(--accent-ink); }
.text { flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.row-title { font-size: 15px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-sub { font-size: 12px; font-weight: 500; color: var(--muted); }
.amount { font-size: 15px; font-weight: 700; color: var(--accent-ink); }
</style>
