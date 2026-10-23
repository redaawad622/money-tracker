<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import DailyBarChart, { type DayBar } from '../components/DailyBarChart.vue'
import MonthSwitcher from '../components/MonthSwitcher.vue'
import { categoryById } from '../data/categories'
import { daysBetween, monthDates, parseYmd, todayYmd, weekdayShort } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { useViewMonth } from '../composables/useViewMonth'
import { useBudgetStore } from '../stores/budget'
import { useExpensesStore } from '../stores/expenses'
import { useSettingsStore } from '../stores/settings'

const { month, isCurrentMonth, prev, next } = useViewMonth()
const expenses = useExpensesStore()
const budget = useBudgetStore()
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

    <section class="card">
      <div class="card-head">
        <h2 class="section-title">Daily spending</h2>
        <span class="hint">Avg {{ money(average) }} / day</span>
      </div>
      <DailyBarChart :bars="bars" :daily-budget="summary.dailyBudget" />
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
