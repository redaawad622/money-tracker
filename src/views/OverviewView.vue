<script setup lang="ts">
import { computed } from 'vue'
import AccountButton from '../components/AccountButton.vue'
import AppIcon from '../components/AppIcon.vue'
import DailyBarChart, { type DayBar } from '../components/DailyBarChart.vue'
import MonthSwitcher from '../components/MonthSwitcher.vue'
import { categoryById } from '../data/categories'
import { daysBetween, formatDayMonth, monthDates, parseYmd, todayYmd, weekdayShort } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { dueSoon, whenDue } from '../lib/reminders'
import { useViewMonth } from '../composables/useViewMonth'
import { useAccountsStore } from '../stores/accounts'
import { useBudgetStore } from '../stores/budget'
import { useExpensesStore } from '../stores/expenses'
import { useGoalsStore } from '../stores/goals'
import { useRewardsStore } from '../stores/rewards'
import { useSettingsStore } from '../stores/settings'
import { useSubscriptionsStore } from '../stores/subscriptions'

const { month, isCurrentMonth, prev, next } = useViewMonth()
const expenses = useExpensesStore()
const budget = useBudgetStore()
const rewards = useRewardsStore()
const subs = useSubscriptionsStore()
const accounts = useAccountsStore()
const goals = useGoalsStore()
const { settings } = useSettingsStore()
const today = todayYmd()

const money = (n: number) => formatMoney(n, settings.currency)
const summary = computed(() => budget.monthSummary(month.value))
const dates = computed(() => monthDates(month.value))

const pct = computed(() => {
  const { spent, budget: b } = summary.value
  return b > 0 ? Math.min(100, Math.round((spent / b) * 100)) : 0
})
const overBudget = computed(() => summary.value.left < 0)

const daysLeft = computed(() => (isCurrentMonth.value ? daysBetween(today, dates.value[dates.value.length - 1]) + 1 : 0))
const perDayLeft = computed(() => (daysLeft.value > 0 ? Math.max(summary.value.left, 0) / daysLeft.value : 0))

// A nudge before the month runs out: the share of the budget spent, and today against its own limit.
const warning = computed(() => {
  if (!isCurrentMonth.value || overBudget.value || summary.value.budget <= 0) return null
  const lines: string[] = []
  const used = Math.round((summary.value.spent / summary.value.budget) * 100)
  const threshold = settings.budgetWarningPercent
  if (threshold > 0 && used >= threshold) {
    const days = `${daysLeft.value} ${daysLeft.value === 1 ? 'day' : 'days'}`
    lines.push(`You've used ${used}% of this month's budget with ${days} left. That's ${money(perDayLeft.value)} a day from here.`)
  }
  const todaySpent = expenses.totalForDate(today)
  const todayLimit = budget.limitForDate(today)
  if (threshold > 0 && todaySpent > todayLimit) lines.push(`Today is ${money(todaySpent - todayLimit)} over its daily budget.`)
  return lines.length ? lines : null
})

const DUE_SOON_DAYS = 3
const billsDueSoon = computed(() =>
  isCurrentMonth.value
    ? dueSoon(subs.subscriptions, today, Math.max(DUE_SOON_DAYS, settings.billReminders ? settings.billReminderDays : 0)).map(({ sub, date }) => ({
        key: `${sub.id}:${date}`,
        name: sub.name,
        when: daysBetween(today, date) <= 1 ? whenDue(daysBetween(today, date)) : formatDayMonth(date),
        amount: money(sub.amount),
      }))
    : [],
)

const monthRewards = computed(() => rewards.earnedInMonth(month.value))
const showRewards = computed(() => rewards.rewards.length > 0 || settings.azkarReward > 0 || settings.workoutReward > 0)

const elapsedDays = computed(() => {
  if (isCurrentMonth.value) return parseYmd(today).getDate()
  return month.value < today ? dates.value.length : 0
})
const average = computed(() => (elapsedDays.value ? summary.value.daily / elapsedDays.value : 0))

const bars = computed<DayBar[]>(() =>
  dates.value.map((date, i) => ({
    date,
    day: i + 1,
    amount: date > today ? null : expenses.totalForDate(date),
    isToday: date === today,
  })),
)

const recentDays = computed(() =>
  dates.value
    .filter((d) => d <= today && expenses.forDate(d).length > 0)
    .reverse()
    .slice(0, 5)
    .map((date) => {
      const list = expenses.forDate(date)
      const names = [...new Set(list.map((e) => categoryById(e.categoryId).name))]
      const diff = daysBetween(date, today)
      return {
        date,
        weekday: weekdayShort(date),
        day: parseYmd(date).getDate(),
        title: diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : parseYmd(date).toLocaleDateString('en-GB', { weekday: 'long' }),
        detail: `${list.length} ${list.length === 1 ? 'expense' : 'expenses'} · ${names.slice(0, 3).join(', ')}`,
        total: money(expenses.totalForDate(date)),
        isToday: diff === 0,
      }
    }),
)
</script>

<template>
  <main class="page">
    <header class="header">
      <MonthSwitcher :month="month" :can-go-next="!isCurrentMonth" @prev="prev" @next="next" />
      <div class="header-actions">
        <AccountButton />
        <RouterLink to="/settings" class="icon-btn" aria-label="Settings"><AppIcon name="gear" /></RouterLink>
      </div>
    </header>

    <section class="hero" :class="{ 'hero--over': overBudget }">
      <div class="hero-top">
        <span class="hero-label">Spent this month</span>
        <div class="hero-amounts">
          <span class="hero-spent">{{ money(summary.spent) }}</span>
          <span class="hero-label">of {{ money(summary.budget) }}</span>
        </div>
      </div>
      <div class="progress"><div class="progress-fill" :style="{ width: `${pct}%` }" /></div>
      <div class="hero-stats">
        <div class="stat">
          <span class="stat-label">{{ overBudget ? 'Over budget by' : 'Left to spend' }}</span>
          <span class="stat-value">{{ money(Math.abs(summary.left)) }}</span>
        </div>
        <div v-if="isCurrentMonth" class="stat">
          <span class="stat-label">Per day, {{ daysLeft }} {{ daysLeft === 1 ? 'day' : 'days' }} left</span>
          <span class="stat-value">{{ money(perDayLeft) }}</span>
        </div>
        <div v-else class="stat">
          <span class="stat-label">Daily spending</span>
          <span class="stat-value">{{ money(summary.daily) }}</span>
        </div>
      </div>
      <RouterLink v-if="summary.fixed > 0" to="/fixed" class="hero-fixed">
        <AppIcon name="repeat" :size="16" />
        Fixed subscriptions this month: {{ money(summary.fixed) }}
        <template v-if="!settings.includeSubscriptionsInBudget">(not counted)</template>
      </RouterLink>
    </section>

    <section v-if="warning" class="card warning" role="status">
      <span class="warning-icon"><AppIcon name="trend" /></span>
      <span class="warning-text">
        <span v-for="line in warning" :key="line">{{ line }}</span>
      </span>
    </section>

    <RouterLink v-if="billsDueSoon.length" to="/fixed" class="card due">
      <span class="due-head">
        <span class="section-title">Due soon</span>
        <AppIcon name="forward" :size="18" class="rewards-go" />
      </span>
      <span v-for="b in billsDueSoon" :key="b.key" class="due-row">
        <span class="due-name">{{ b.name }}</span>
        <span class="due-when">{{ b.when }}</span>
        <span class="due-amount">{{ b.amount }}</span>
      </span>
    </RouterLink>

    <div v-if="accounts.visible.length || goals.goals.length" class="tiles">
      <RouterLink v-if="accounts.visible.length" to="/accounts" class="card tile">
        <span class="tile-head"><AppIcon name="wallet" :size="18" />Accounts</span>
        <span class="tile-value">{{ money(accounts.total) }}</span>
      </RouterLink>
      <RouterLink v-if="goals.goals.length" to="/goals" class="card tile">
        <span class="tile-head"><AppIcon name="target" :size="18" />Goals</span>
        <span class="tile-value">{{ money(goals.totalSaved) }}</span>
      </RouterLink>
    </div>

    <RouterLink v-if="showRewards" to="/rewards" class="card rewards">
      <span class="rewards-icon"><AppIcon name="gift" /></span>
      <span class="rewards-text">
        <span class="rewards-title">Reward pot {{ money(rewards.balance) }}</span>
        <span class="rewards-sub">{{ monthRewards > 0 ? `+${money(monthRewards)} earned this month` : 'From Azkar and Workout' }}</span>
      </span>
      <AppIcon name="forward" :size="18" class="rewards-go" />
    </RouterLink>

    <section class="card">
      <div class="card-head">
        <h2 class="section-title">Daily spending</h2>
        <span class="hint">Avg {{ money(average) }} / day</span>
      </div>
      <DailyBarChart :bars="bars" :limits="budget.dailyLimits(month)" />
    </section>

    <section class="recent">
      <div class="card-head">
        <h2 class="section-title">Recent days</h2>
        <RouterLink :to="{ path: '/calendar', query: $route.query }" class="link">See all</RouterLink>
      </div>
      <p v-if="recentDays.length === 0" class="card empty">No expenses yet this month. Tap + to add one.</p>
      <RouterLink v-for="d in recentDays" :key="d.date" :to="`/day/${d.date}`" class="day-row card">
        <span class="day-badge" :class="{ 'day-badge--today': d.isToday }">
          <span class="day-badge-wd">{{ d.weekday }}</span><span class="day-badge-d">{{ d.day }}</span>
        </span>
        <span class="day-text">
          <span class="day-title">{{ d.title }}</span>
          <span class="day-detail">{{ d.detail }}</span>
        </span>
        <span class="day-total">{{ d.total }}</span>
      </RouterLink>
    </section>
  </main>
</template>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; min-height: 48px; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.hero {
  background: var(--accent); color: #fff; border-radius: 24px; padding: 20px;
  display: flex; flex-direction: column; gap: 14px;
}
.hero--over { background: #8A430A; }
.hero-top { display: flex; flex-direction: column; gap: 4px; }
.hero-label { font-size: 13px; font-weight: 600; opacity: 0.85; }
.hero-amounts { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.hero-spent { font-size: 36px; font-weight: 800; letter-spacing: -0.03em; }
.progress { height: 10px; background: rgba(255, 255, 255, 0.22); border-radius: 99px; overflow: hidden; }
.progress-fill { height: 100%; background: #fff; border-radius: 99px; }
.hero-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.stat { background: rgba(255, 255, 255, 0.12); border-radius: 14px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
.stat-label { font-size: 12px; font-weight: 600; opacity: 0.85; }
.stat-value { font-size: 17px; font-weight: 700; }
.hero-fixed { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; opacity: 0.9; color: #fff; }
.warning {
  display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px;
  background: var(--warn-soft); border-color: #F2D2B4; color: var(--warn-ink);
}
.warning-icon {
  width: 36px; height: 36px; border-radius: 11px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center;
  background: #fff; color: var(--warn-ink);
}
.warning-text { display: flex; flex-direction: column; gap: 4px; font-size: 13px; font-weight: 600; line-height: 1.45; padding-top: 2px; }
.due { display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; }
.due-head { display: flex; align-items: center; justify-content: space-between; }
.due-row { display: flex; align-items: baseline; gap: 8px; font-size: 14px; }
.due-name { flex: 1 1 auto; font-weight: 700; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.due-when { font-size: 12px; font-weight: 600; color: var(--muted); }
.due-amount { font-weight: 700; }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 10px; }
.tile { display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; min-width: 0; }
.tile-head { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--muted); }
.tile-value { font-size: 17px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rewards { display: flex; align-items: center; gap: 12px; padding: 12px 14px; }
.rewards-icon {
  width: 40px; height: 40px; border-radius: 12px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center;
  background: var(--accent-soft); color: var(--accent-ink);
}
.rewards-text { flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.rewards-title { font-size: 15px; font-weight: 700; }
.rewards-sub { font-size: 12px; font-weight: 600; color: var(--muted); }
.rewards-go { color: var(--muted); }
.card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.hint { font-size: 12px; font-weight: 600; color: var(--muted); }
.link { font-size: 13px; font-weight: 700; color: var(--accent); padding: 6px 0; }
.recent { display: flex; flex-direction: column; gap: 8px; }
.recent .card-head { margin-bottom: 0; }
.day-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 18px; }
.day-badge {
  width: 40px; height: 40px; border-radius: 12px; background: #EEF0EB; flex: 0 0 auto;
  display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1;
}
.day-badge--today { background: var(--accent-soft); color: var(--accent); }
.day-badge-wd { font-size: 10px; font-weight: 700; }
.day-badge-d { font-size: 15px; font-weight: 800; }
.day-text { flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.day-title { font-size: 15px; font-weight: 700; }
.day-detail { font-size: 12px; font-weight: 500; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.day-total { font-size: 15px; font-weight: 700; }
</style>
