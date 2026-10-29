<script setup lang="ts">
import { lang, locale, t } from '../i18n'
import { computed } from 'vue'
import MonthSwitcher from '../components/MonthSwitcher.vue'
import { formatDay, mondayIndex, monthDates, parseYmd, todayYmd } from '../lib/dates'
import { formatMoney, sumMoney } from '../lib/money'
import { useViewMonth } from '../composables/useViewMonth'
import { useBudgetStore } from '../stores/budget'
import { useExpensesStore } from '../stores/expenses'
import { useSettingsStore } from '../stores/settings'

// Monday first; 1 Jan 2024 was a Monday. Arabic short names are whole words, so it uses the narrow ones.
const weekdays = computed(() =>
  Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale(), { weekday: lang.value === 'ar' ? 'narrow' : 'short' })),
)

const { month, isCurrentMonth, prev, next } = useViewMonth()
const expenses = useExpensesStore()
const budget = useBudgetStore()
const { settings } = useSettingsStore()
const today = todayYmd()
const money = (n: number) => formatMoney(n, settings.currency)

const summary = computed(() => budget.monthSummary(month.value))
const limits = computed(() => budget.dailyLimits(month.value))
const dates = computed(() => monthDates(month.value))
const pastDates = computed(() => dates.value.filter((d) => d <= today))

function level(amount: number, daily: number): number {
  if (amount <= 0) return 0
  if (amount < daily * 0.5) return 1
  if (amount <= daily) return 2
  if (amount <= daily * 2) return 3
  return 4
}

const cells = computed(() => {
  const lead = mondayIndex(dates.value[0])
  const blanks = Array.from({ length: lead }, (_, i) => ({ key: `b${i}`, blank: true as const }))
  const days = dates.value.map((date, i) => {
    const amount = expenses.totalForDate(date)
    const future = date > today
    return {
      key: date,
      blank: false as const,
      date,
      day: parseYmd(date).getDate(),
      amount: amount ? String(Math.round(amount)) : '',
      level: future ? 'future' : `l${level(amount, limits.value[i])}`,
      isToday: date === today,
      aria: `${formatDay(date)}، ${future ? t('upcoming') : money(amount)}`,
    }
  })
  return [...blanks, ...days]
})

const stats = computed(() => {
  const totals = pastDates.value.map((d) => ({ date: d, amount: expenses.totalForDate(d) }))
  const max = totals.reduce((best, t) => (t.amount > best.amount ? t : best), { date: '', amount: 0 })
  const lastSeven = totals.slice(-7).map((t) => t.amount)
  return {
    average: totals.length ? summary.value.daily / totals.length : 0,
    week: sumMoney(lastSeven),
    max,
    over: totals.filter((t, i) => t.amount > limits.value[i]).length,
    count: totals.length,
  }
})
</script>

<template>
  <main class="page">
    <header class="header">
      <MonthSwitcher :month="month" :can-go-next="!isCurrentMonth" @prev="prev" @next="next" />
      <span class="muted spent">{{ t('{amount} spent', { amount: money(summary.daily) }) }}</span>
    </header>

    <section class="card calendar">
      <div class="weekdays"><span v-for="w in weekdays" :key="w">{{ w }}</span></div>
      <div class="grid">
        <template v-for="c in cells" :key="c.key">
          <div v-if="c.blank" class="cell cell--blank" />
          <RouterLink v-else :to="`/day/${c.date}`" class="cell" :class="[`cell--${c.level}`, { 'cell--today': c.isToday }]" :aria-label="c.aria">
            <span class="cell-day">{{ c.day }}</span>
            <span class="cell-amt">{{ c.amount }}</span>
          </RouterLink>
        </template>
      </div>
      <div class="legend">
        <span>{{ t('Less') }}</span>
        <span class="chip cell--l1" /><span class="chip cell--l2" /><span class="chip cell--l3" /><span class="chip cell--l4" />
        <span>{{ t('More') }}</span>
      </div>
    </section>

    <section class="stats">
      <div class="card stat"><span class="stat-label">{{ t('Average per day') }}</span><span class="stat-value">{{ money(stats.average) }}</span></div>
      <div class="card stat"><span class="stat-label">{{ t('Last 7 days') }}</span><span class="stat-value">{{ money(stats.week) }}</span></div>
      <div class="card stat">
        <span class="stat-label">{{ t('Highest day') }}<template v-if="stats.max.date"> · {{ formatDay(stats.max.date) }}</template></span>
        <span class="stat-value">{{ money(stats.max.amount) }}</span>
      </div>
      <div class="card stat stat--warn">
        <span class="stat-label">{{ t('Over daily budget') }}</span>
        <span class="stat-value">{{ t('{n} of {total} days', { n: stats.over, total: stats.count }) }}</span>
      </div>
    </section>
  </main>
</template>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px; min-height: 48px; }
.spent { font-size: 13px; font-weight: 600; }
.calendar { padding: 14px 12px; display: flex; flex-direction: column; gap: 8px; }
.weekdays, .grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 5px; }
.weekdays { font-size: 11px; font-weight: 700; color: var(--muted); text-align: center; }
.cell {
  height: 52px; border-radius: 12px; padding: 5px 0 5px 6px;
  display: flex; flex-direction: column; justify-content: space-between; background: var(--line-soft);
}
.cell--blank { background: transparent; }
.cell-day { font-size: 12px; font-weight: 800; }
.cell-amt { font-size: 11px; font-weight: 700; }
.cell--l0 { background: #F4F5F1; }
.cell--l1 { background: #EAF3EE; }
.cell--l2 { background: #B9D6C9; }
.cell--l3 { background: #377A5F; color: #fff; }
.cell--l4 { background: #163F30; color: #fff; }
.cell--future { background: transparent; border: 1px dashed #D5DAD3; color: var(--faint); }
.cell--today { outline: 2px solid var(--warn); outline-offset: -2px; }
.legend { display: flex; align-items: center; justify-content: flex-end; gap: 4px; font-size: 11px; font-weight: 600; color: var(--muted); padding-top: 4px; }
.chip { width: 14px; height: 14px; border-radius: 4px; }
.stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.stat { padding: 12px 14px; border-radius: 18px; display: flex; flex-direction: column; gap: 4px; }
.stat-label { font-size: 12px; font-weight: 600; color: var(--muted); }
.stat-value { font-size: 18px; font-weight: 800; }
.stat--warn { background: var(--warn-soft); border-color: #F3D5B8; }
.stat--warn .stat-label { color: var(--warn-ink); }
.stat--warn .stat-value { color: #6E3608; }
</style>
