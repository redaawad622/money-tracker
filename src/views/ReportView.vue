<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import MonthSwitcher from '../components/MonthSwitcher.vue'
import type { IconName } from '../data/icons'
import { FAMILY_COLORS, categoryById } from '../data/categories'
import { addMonthsToKey, formatDay, formatMonth, monthDates, parseYmd, todayYmd } from '../lib/dates'
import { monthIncome, type MonthIncome } from '../lib/income'
import { formatMoney, sumMoney } from '../lib/money'
import { categoryTotals, change, dayStats } from '../lib/report'
import { useIncomeLock } from '../composables/useIncomeLock'
import { useViewMonth } from '../composables/useViewMonth'
import { useBudgetStore } from '../stores/budget'
import { useExpensesStore } from '../stores/expenses'
import { useIncomeStore } from '../stores/income'
import { useSettingsStore } from '../stores/settings'
import { useSubscriptionsStore } from '../stores/subscriptions'

const route = useRoute()
const { month, isCurrentMonth, prev, next } = useViewMonth()
const expenses = useExpensesStore()
const budget = useBudgetStore()
const subs = useSubscriptionsStore()
const income = useIncomeStore()
const incomeLock = useIncomeLock()
const { settings } = useSettingsStore()
const today = todayYmd()

const money = (n: number) => formatMoney(n, settings.currency)
const monthName = (key: string) => formatMonth(key).split(' ')[0]

const prevMonth = computed(() => addMonthsToKey(month.value, -1))
const summary = computed(() => budget.monthSummary(month.value))
const prevSummary = computed(() => budget.monthSummary(prevMonth.value))
const isFuture = computed(() => `${month.value}-01` > today)

const pct = computed(() => {
  const { spent, budget: b } = summary.value
  return b > 0 ? Math.min(100, Math.round((spent / b) * 100)) : 0
})
const overBudget = computed(() => summary.value.left < 0)

/** "+12%" / "−8%" for a change, or the amount when last month had nothing. */
function changeLabel(now: number, before: number): string {
  const c = change(now, before)
  if (c.diff === 0) return 'Same as'
  if (c.percent === null) return `+${money(c.diff)} on`
  return `${c.diff > 0 ? '+' : '−'}${Math.abs(Math.round(c.percent))}% on`
}
const spentChange = computed(() => change(summary.value.spent, prevSummary.value.spent))

// Days
const dates = computed(() => monthDates(month.value))
const days = computed(() => {
  const all = dates.value
  const counted = isCurrentMonth.value ? parseYmd(today).getDate() : isFuture.value ? 0 : all.length
  const finished = isCurrentMonth.value ? counted - 1 : counted
  return dayStats(all.map((d) => expenses.totalForDate(d)), budget.dailyLimits(month.value), counted, finished)
})
const highestDay = computed(() => (days.value.highest >= 0 ? dates.value[days.value.highest] : null))

// Categories
const categories = computed(() => {
  const before = new Map(categoryTotals(expenses.expenses, prevMonth.value).map((c) => [c.id, c.amount]))
  const total = summary.value.daily
  return categoryTotals(expenses.expenses, month.value).map((c) => {
    const cat = categoryById(c.id)
    return {
      ...c,
      name: cat.name,
      icon: cat.icon,
      color: FAMILY_COLORS[cat.family].bar,
      tint: FAMILY_COLORS[cat.family].tint,
      ink: FAMILY_COLORS[cat.family].ink,
      pct: total ? Math.round((c.amount / total) * 100) : 0,
      diff: change(c.amount, before.get(c.id) ?? 0).diff,
    }
  })
})
const fromRewards = computed(() =>
  sumMoney(expenses.expenses.filter((e) => e.fromRewards && e.date.startsWith(`${month.value}-`)).map((e) => e.amount)),
)

// Fixed subscriptions due this month
const fixed = computed(() =>
  subs.dueInMonth(month.value)
    .map(({ sub, date }) => ({ key: `${sub.id}-${date}`, name: sub.name, date, amount: sub.amount, paid: sub.paid.includes(date) }))
    .sort((a, b) => a.date.localeCompare(b.date)),
)

// Income, behind the Income password when one is set
const incomeVisible = computed(() => !incomeLock.stored.value || incomeLock.unlocked.value)
const hasIncome = computed(() => income.sources.length > 0)
const monthIn = computed(() => monthIncome(income.sources, month.value))
const prevIn = computed(() => monthIncome(income.sources, prevMonth.value))
/** Everything that went out: daily spending and every fixed subscription due, counted in the budget or not. */
const outgoing = computed(() => sumMoney([summary.value.daily, summary.value.fixed]))
const prevOutgoing = computed(() => sumMoney([prevSummary.value.daily, prevSummary.value.fixed]))
const saved = computed(() => sumMoney([monthIn.value.total, -outgoing.value]))
const prevSaved = computed(() => sumMoney([prevIn.value.total, -prevOutgoing.value]))

const INCOME_ROWS: { key: Exclude<keyof MonthIncome, 'total'>; label: string; icon: IconName }[] = [
  { key: 'salary', label: 'Fixed monthly', icon: 'wallet' },
  { key: 'investments', label: 'Yearly investments', icon: 'trend' },
  { key: 'deals', label: 'Deals ended', icon: 'deal' },
  { key: 'projects', label: 'Projects', icon: 'store' },
]

const password = shallowRef('')
const wrong = shallowRef(false)
async function unlock() {
  if (!password.value) return
  wrong.value = !(await incomeLock.unlock(password.value))
  password.value = ''
}
// Unlocking here doesn't carry over to other screens.
onBeforeRouteLeave(() => incomeLock.lock())

const compare = computed(() => {
  const rows = [
    { label: 'Daily spending', now: summary.value.daily, before: prevSummary.value.daily, good: 'down' },
    { label: 'Fixed subscriptions', now: summary.value.fixed, before: prevSummary.value.fixed, good: 'down' },
    { label: 'Average per day', now: days.value.average, before: prevAverage.value, good: 'down' },
  ]
  if (incomeVisible.value && hasIncome.value) {
    rows.push(
      { label: 'Income', now: monthIn.value.total, before: prevIn.value.total, good: 'up' },
      { label: 'Saved', now: saved.value, before: prevSaved.value, good: 'up' },
    )
  }
  return rows.map((r) => {
    const diff = sumMoney([r.now, -r.before])
    return { ...r, diff, better: diff === 0 ? null : (diff > 0) === (r.good === 'up') }
  })
})
const prevAverage = computed(() => {
  const n = monthDates(prevMonth.value).length
  return n ? prevSummary.value.daily / n : 0
})

const backLink = computed(() => ({ path: '/', query: route.query }))
</script>

<template>
  <main class="page page--no-tabs">
    <header class="header">
      <RouterLink :to="backLink" class="icon-btn icon-btn--plain" aria-label="Back to overview"><AppIcon name="back" /></RouterLink>
      <MonthSwitcher :month="month" :can-go-next="!isCurrentMonth" @prev="prev" @next="next" />
      <div class="spacer" />
    </header>

    <section class="hero" :class="{ 'hero--over': overBudget }">
      <div class="hero-top">
        <span class="hero-label">{{ isCurrentMonth ? `Spent so far, ${days.days} of ${dates.length} days` : `Spent in ${monthName(month)}` }}</span>
        <div class="hero-amounts">
          <span class="hero-spent">{{ money(summary.spent) }}</span>
          <span class="hero-label">of {{ money(summary.budget) }}</span>
        </div>
      </div>
      <div class="progress"><div class="progress-fill" :style="{ width: `${pct}%` }" /></div>
      <div class="hero-stats">
        <div class="stat">
          <span class="stat-label">{{ overBudget ? 'Over budget by' : 'Left in budget' }}</span>
          <span class="stat-value">{{ money(Math.abs(summary.left)) }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">{{ changeLabel(summary.spent, prevSummary.spent) }} {{ monthName(prevMonth) }}</span>
          <span class="stat-value">
            <AppIcon v-if="spentChange.diff !== 0" :name="spentChange.diff > 0 ? 'up' : 'down'" :size="15" :stroke-width="2.4" />
            {{ money(Math.abs(spentChange.diff)) }}
          </span>
        </div>
      </div>
      <span v-if="summary.fixed > 0" class="hero-note">
        Includes {{ money(summary.fixed) }} fixed subscriptions<template v-if="!settings.includeSubscriptionsInBudget"> — not counted in the budget</template>
      </span>
    </section>

    <section class="card">
      <div class="card-head">
        <h2 class="section-title">Days</h2>
        <span class="hint">Daily budget {{ money(summary.dailyBudget) }}</span>
      </div>
      <p v-if="days.days === 0" class="muted small">This month hasn't started yet.</p>
      <div v-else class="tiles">
        <div class="tile"><span class="tile-label">Average per day</span><span class="tile-value">{{ money(days.average) }}</span></div>
        <RouterLink v-if="highestDay" :to="`/day/${highestDay}`" class="tile tile--link">
          <span class="tile-label">Highest, {{ formatDay(highestDay) }}</span>
          <span class="tile-value">{{ money(expenses.totalForDate(highestDay)) }}</span>
        </RouterLink>
        <div v-else class="tile"><span class="tile-label">Highest day</span><span class="tile-value">—</span></div>
        <div class="tile"><span class="tile-label">Under budget</span><span class="tile-value good">{{ days.under }} {{ days.under === 1 ? 'day' : 'days' }}</span></div>
        <div class="tile"><span class="tile-label">Over budget</span><span class="tile-value" :class="{ bad: days.over > 0 }">{{ days.over }} {{ days.over === 1 ? 'day' : 'days' }}</span></div>
      </div>
      <p v-if="days.noSpend > 0" class="muted small no-spend">{{ days.noSpend }} {{ days.noSpend === 1 ? 'day' : 'days' }} with no spending</p>
    </section>

    <section class="card split">
      <div class="card-head">
        <h2 class="section-title">By category</h2>
        <span class="hint">vs {{ monthName(prevMonth) }}</span>
      </div>
      <p v-if="categories.length === 0" class="muted small">No daily spending this month.</p>
      <template v-else>
        <div class="split-bar" role="img" aria-label="Split of this month's spending by category">
          <div v-for="c in categories" :key="c.id" :style="{ width: `${c.pct}%`, background: c.color }" />
        </div>
        <div v-for="c in categories" :key="c.id" class="cat-row">
          <span class="cat-icon" :style="{ background: c.tint, color: c.ink }"><AppIcon :name="c.icon" :size="18" /></span>
          <span class="cat-text">
            <span class="cat-name">{{ c.name }}</span>
            <span class="cat-sub">
              {{ c.pct }}%<template v-if="c.diff !== 0"> ·
                <span :class="c.diff > 0 ? 'bad' : 'good'">{{ c.diff > 0 ? '+' : '−' }}{{ money(Math.abs(c.diff)) }}</span></template>
            </span>
          </span>
          <span class="cat-amount">{{ money(c.amount) }}</span>
        </div>
      </template>
      <p v-if="fromRewards > 0" class="muted small">+ {{ money(fromRewards) }} paid from rewards, not counted</p>
    </section>

    <section v-if="fixed.length" class="card">
      <div class="card-head">
        <h2 class="section-title">Fixed subscriptions</h2>
        <span class="hint">{{ money(summary.fixed) }}</span>
      </div>
      <div v-for="f in fixed" :key="f.key" class="line">
        <span class="line-name">{{ f.name }}</span>
        <span class="muted small">{{ formatDay(f.date) }}</span>
        <span class="tag" :class="f.paid ? 'tag--paid' : 'tag--due'">{{ f.paid ? 'Paid' : 'Due' }}</span>
        <span class="line-amount">{{ money(f.amount) }}</span>
      </div>
    </section>

    <section v-if="hasIncome || incomeLock.stored.value" class="card">
      <div class="card-head">
        <h2 class="section-title">Income</h2>
        <span v-if="incomeVisible" class="hint">{{ money(monthIn.total) }}</span>
      </div>
      <form v-if="!incomeVisible" class="unlock" @submit.prevent="unlock">
        <p class="muted small">Income is locked. Enter your Income password to include it.</p>
        <label class="field">
          <span class="visually-hidden">Income password</span>
          <input v-model="password" type="password" autocomplete="current-password" placeholder="Password" :aria-invalid="wrong" />
        </label>
        <p v-if="wrong" class="error" role="alert">Wrong password. Try again.</p>
        <button type="submit" class="primary-btn" :disabled="!password">Show income</button>
      </form>
      <template v-else>
        <div v-for="r in INCOME_ROWS.filter((r) => monthIn[r.key] !== 0)" :key="r.key" class="line">
          <span class="line-icon"><AppIcon :name="r.icon" :size="18" /></span>
          <span class="line-name">{{ r.label }}</span>
          <span class="line-amount">{{ money(monthIn[r.key]) }}</span>
        </div>
        <div class="saved" :class="{ 'saved--neg': saved < 0 }">
          <span class="saved-text">
            <span class="saved-label">{{ saved < 0 ? 'Spent more than came in' : 'Saved this month' }}</span>
            <span class="muted small">Income minus {{ money(outgoing) }} spent and fixed</span>
          </span>
          <span class="saved-value">{{ money(Math.abs(saved)) }}</span>
        </div>
      </template>
    </section>

    <section class="card">
      <div class="card-head">
        <h2 class="section-title">Compared with {{ monthName(prevMonth) }}</h2>
        <span v-if="isCurrentMonth" class="hint">{{ monthName(prevMonth) }} in full</span>
      </div>
      <div class="cmp-head muted"><span /><span>{{ monthName(month).slice(0, 3) }}</span><span>{{ monthName(prevMonth).slice(0, 3) }}</span></div>
      <div v-for="r in compare" :key="r.label" class="cmp-row">
        <span class="cmp-label">
          {{ r.label }}
          <span v-if="r.better !== null" class="cmp-diff" :class="r.better ? 'good' : 'bad'">
            {{ r.diff > 0 ? '+' : '−' }}{{ money(Math.abs(r.diff)) }}
          </span>
        </span>
        <span class="cmp-now">{{ money(r.now) }}</span>
        <span class="cmp-before muted">{{ money(r.before) }}</span>
      </div>
    </section>
  </main>
</template>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; min-height: 48px; margin-left: -10px; }
.spacer { width: 34px; }
.hero { background: var(--accent); color: #fff; border-radius: 24px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
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
.stat-value { font-size: 17px; font-weight: 700; display: flex; align-items: center; gap: 4px; }
.hero-note { font-size: 13px; font-weight: 600; opacity: 0.9; }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.hint { font-size: 12px; font-weight: 600; color: var(--muted); }
.small { font-size: 13px; font-weight: 600; }
.good { color: var(--accent-ink); }
.bad { color: var(--warn-ink); }
.tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.tile { background: var(--line-soft); border-radius: 14px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tile--link { background: var(--accent-soft); }
.tile-label { font-size: 12px; font-weight: 600; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tile-value { font-size: 16px; font-weight: 700; }
.no-spend { margin-top: 10px; }
.split { display: flex; flex-direction: column; gap: 10px; }
.split .card-head { margin-bottom: 2px; }
.split-bar { display: flex; height: 12px; border-radius: 99px; overflow: hidden; gap: 2px; }
.cat-row { display: flex; align-items: center; gap: 12px; }
.cat-icon { width: 36px; height: 36px; border-radius: 11px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; }
.cat-text { flex: 1 1 auto; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.cat-name { font-size: 14px; font-weight: 700; }
.cat-sub { font-size: 12px; font-weight: 600; color: var(--muted); }
.cat-amount { font-size: 14px; font-weight: 700; }
.line { display: flex; align-items: center; gap: 10px; min-height: 40px; }
.line + .line { border-top: 1px solid var(--line-soft); }
.line-icon { width: 32px; height: 32px; border-radius: 10px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; background: var(--accent-soft); color: var(--accent-ink); }
.line-name { flex: 1 1 auto; font-size: 14px; font-weight: 700; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.line-amount { font-size: 14px; font-weight: 700; text-align: right; min-width: 84px; }
.tag { font-size: 11px; font-weight: 700; border-radius: 99px; padding: 3px 8px; }
.tag--paid { background: var(--accent-soft); color: var(--accent-ink); }
.tag--due { background: var(--warn-soft); color: var(--warn-ink); }
.unlock { display: flex; flex-direction: column; gap: 8px; }
.error { font-size: 13px; font-weight: 600; color: var(--warn-ink); }
.saved { margin-top: 8px; display: flex; align-items: center; gap: 12px; background: var(--accent-soft); border-radius: 14px; padding: 12px; }
.saved--neg { background: var(--warn-soft); }
.saved-text { flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px; }
.saved-label { font-size: 14px; font-weight: 700; }
.saved-value { font-size: 18px; font-weight: 800; }
.saved--neg .saved-value { color: var(--warn-ink); }
.cmp-head, .cmp-row { display: grid; grid-template-columns: minmax(0, 1fr) 88px 88px; gap: 8px; align-items: center; }
.cmp-head { font-size: 12px; font-weight: 700; text-align: right; padding-bottom: 4px; }
.cmp-row { min-height: 40px; border-top: 1px solid var(--line-soft); font-size: 14px; }
.cmp-label { font-weight: 700; display: flex; flex-direction: column; gap: 1px; }
.cmp-diff { font-size: 12px; font-weight: 600; }
.cmp-now { font-weight: 700; text-align: right; }
.cmp-before { font-weight: 600; text-align: right; }
</style>
