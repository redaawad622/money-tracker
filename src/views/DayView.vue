<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import ExpenseRow from '../components/ExpenseRow.vue'
import { FAMILY_COLORS, categoryById } from '../data/categories'
import { formatDay, monthKeyOf, parseYmd, toYmd, todayYmd } from '../lib/dates'
import { formatMoney, sumMoney } from '../lib/money'
import { useBudgetStore } from '../stores/budget'
import { useExpensesStore } from '../stores/expenses'
import { useSettingsStore } from '../stores/settings'

const route = useRoute()
const router = useRouter()
const expenses = useExpensesStore()
const budget = useBudgetStore()
const { settings } = useSettingsStore()
const today = todayYmd()

const date = computed(() => {
  const p = route.params.date
  return typeof p === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p) ? p : today
})
const money = (n: number) => formatMoney(n, settings.currency)

const list = computed(() => expenses.forDate(date.value))
const total = computed(() => expenses.totalForDate(date.value))
const dailyBudget = computed(() => budget.monthSummary(monthKeyOf(date.value)).dailyBudget)
const diff = computed(() => dailyBudget.value - total.value)
const isToday = computed(() => date.value === today)

const split = computed(() => {
  const byCat = new Map<string, number[]>()
  for (const e of list.value) {
    const values = byCat.get(e.categoryId) ?? []
    values.push(e.amount)
    byCat.set(e.categoryId, values)
  }
  return [...byCat.entries()]
    .map(([id, values]) => {
      const amount = sumMoney(values)
      const cat = categoryById(id)
      return { id, name: cat.name, amount, color: FAMILY_COLORS[cat.family].bar, pct: total.value ? Math.round((amount / total.value) * 100) : 0 }
    })
    .sort((a, b) => b.amount - a.amount)
})

function shiftDay(n: number) {
  const d = parseYmd(date.value)
  d.setDate(d.getDate() + n)
  void router.replace(`/day/${toYmd(d)}`)
}

function back() {
  void router.push({ path: '/', query: monthKeyOf(date.value) === monthKeyOf(today) ? {} : { month: monthKeyOf(date.value) } })
}
</script>

<template>
  <main class="page page--no-tabs">
    <header class="header">
      <button type="button" class="icon-btn" aria-label="Back to overview" @click="back"><AppIcon name="back" /></button>
      <div class="day-nav">
        <button type="button" class="icon-btn icon-btn--plain" aria-label="Previous day" @click="shiftDay(-1)"><AppIcon name="back" :size="18" /></button>
        <h1 class="day-label">{{ formatDay(date) }}</h1>
        <button type="button" class="icon-btn icon-btn--plain" aria-label="Next day" :disabled="isToday" @click="shiftDay(1)"><AppIcon name="forward" :size="18" /></button>
      </div>
      <div class="spacer" />
    </header>

    <section class="total">
      <span class="muted total-label">{{ isToday ? 'Today you spent' : 'Spent this day' }}</span>
      <span class="total-amount">{{ money(total) }}</span>
      <span v-if="total > 0" class="pill" :class="diff >= 0 ? 'pill--under' : 'pill--over'">
        <AppIcon :name="diff >= 0 ? 'down' : 'up'" :size="14" :stroke-width="2.4" />
        {{ money(Math.abs(diff)) }} {{ diff >= 0 ? 'under' : 'over' }} your daily budget
      </span>
    </section>

    <section v-if="split.length" class="card split">
      <h2 class="section-title">By category</h2>
      <div class="split-bar" role="img" aria-label="Split of this day's spending by category">
        <div v-for="s in split" :key="s.id" :style="{ width: `${s.pct}%`, background: s.color }" />
      </div>
      <div v-for="s in split" :key="s.id" class="split-row">
        <span class="swatch" :style="{ background: s.color }" />
        <span class="split-name">{{ s.name }}</span>
        <span class="muted">{{ s.pct }}%</span>
        <span class="split-amount">{{ money(s.amount) }}</span>
      </div>
    </section>

    <section class="expenses">
      <div class="expenses-head">
        <h2 class="section-title">Expenses</h2>
        <span class="muted count">{{ list.length }} {{ list.length === 1 ? 'item' : 'items' }}</span>
      </div>
      <p v-if="list.length === 0" class="card empty">Nothing spent on this day.</p>
      <div v-else class="card list">
        <ExpenseRow v-for="e in list" :key="e.id" :expense="e" :currency="settings.currency" />
      </div>
    </section>

    <RouterLink :to="{ path: '/add', query: { date } }" class="primary-btn add">
      <AppIcon name="plus" :stroke-width="2.4" /> Add expense to this day
    </RouterLink>
  </main>
</template>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; min-height: 48px; }
.day-nav { display: flex; align-items: center; }
.day-label { font-size: 15px; font-weight: 700; }
.spacer { width: 44px; }
.total { display: flex; flex-direction: column; gap: 6px; padding: 4px 4px 0; }
.total-label { font-size: 13px; font-weight: 600; }
.total-amount { font-size: 44px; font-weight: 800; letter-spacing: -0.03em; }
.pill { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; border-radius: 99px; padding: 6px 12px; }
.pill--under { background: var(--accent-soft); color: var(--accent-ink); }
.pill--over { background: var(--warn-soft); color: var(--warn-ink); }
.split { display: flex; flex-direction: column; gap: 10px; }
.split-bar { display: flex; height: 12px; border-radius: 99px; overflow: hidden; gap: 2px; }
.split-row { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 600; }
.swatch { width: 10px; height: 10px; border-radius: 3px; flex: 0 0 auto; }
.split-name { flex: 1 1 auto; }
.split-amount { width: 84px; text-align: right; font-weight: 700; }
.expenses { display: flex; flex-direction: column; gap: 8px; }
.expenses-head { display: flex; align-items: center; justify-content: space-between; }
.count { font-size: 12px; font-weight: 600; }
.list { padding: 4px 14px; }
.add { margin-top: auto; }
</style>
