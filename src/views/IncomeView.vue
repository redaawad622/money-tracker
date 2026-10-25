<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import type { IconName } from '../data/icons'
import { formatDayMonth, monthKeyOf, todayYmd } from '../lib/dates'
import {
  dealDays, dealReport, dealReturnPercent, dealsEndingIn, formatPeriod, investmentMonthlyReturn, investmentReturnForYear,
  investmentYearlyReturn, monthlyRecurring, projectTotals, salaryForYear, yearSummary, type IncomeType,
} from '../lib/income'
import { formatMoney } from '../lib/money'
import { useIncomeStore } from '../stores/income'
import { useSettingsStore } from '../stores/settings'

const route = useRoute()
const router = useRouter()
const income = useIncomeStore()
const { settings } = useSettingsStore()
const today = todayYmd()
const thisYear = Number(today.slice(0, 4))
const money = (n: number) => formatMoney(n, settings.currency)
const pct = (n: number) => `${Math.round(n * 10) / 10}%`

// The year shown, kept in the URL (?year=YYYY) so coming back from a form keeps it.
const year = computed(() => {
  const q = Number(route.query.year)
  return Number.isInteger(q) && q > 1900 && q < 3000 ? q : thisYear
})
function shiftYear(n: number) {
  const next = year.value + n
  void router.replace({ query: { ...route.query, year: next === thisYear ? undefined : String(next) } })
}

const summary = computed(() => yearSummary(income.sources, year.value))
const recurring = computed(() => monthlyRecurring(income.sources, year.value === thisYear ? monthKeyOf(today) : `${year.value}-12`))
const report = computed(() => dealReport(income.deals, year.value))
const yearDeals = computed(() => dealsEndingIn(income.deals, year.value))
const openDeals = computed(() => income.deals.filter((d) => d.end > `${year.value}-12-31` && d.start <= `${year.value}-12-31`))

const BREAKDOWN: { key: Exclude<keyof typeof summary.value, 'total'>; label: string; icon: IconName }[] = [
  { key: 'salary', label: 'Fixed monthly', icon: 'wallet' },
  { key: 'investments', label: 'Yearly investments', icon: 'trend' },
  { key: 'deals', label: 'Deals', icon: 'deal' },
  { key: 'projects', label: 'Projects', icon: 'store' },
]

const SECTIONS: { type: IncomeType; title: string; hint: string; empty: string }[] = [
  { type: 'salary', title: 'Fixed monthly', hint: 'Salary and other fixed amounts', empty: 'Add your salary or any amount you get every month.' },
  { type: 'investment', title: 'Yearly investments', hint: 'Earn your chosen % per year', empty: 'Add money you invest at a yearly return, like 25%.' },
  { type: 'deal', title: 'Deals', hint: 'Counted in the year they end', empty: 'Add a deal with what you put in, what it earned and its dates.' },
  { type: 'project', title: 'Personal projects', hint: 'Cafe, restaurant, side business…', empty: 'Add a project, then log what it earns and costs.' },
]

const range = (start: string, end: string | null) => `${formatDayMonth(start)} ${start.slice(0, 4)} – ${end ? `${formatDayMonth(end)} ${end.slice(0, 4)}` : 'ongoing'}`
const newLink = (type: IncomeType) => ({ path: `/income/new/${type}`, query: route.query })
const editLink = (id: string) => ({ path: `/income/${id}`, query: route.query })
const projectLink = (id: string) => ({ path: `/income/project/${id}`, query: route.query })
</script>

<template>
  <main class="page">
    <header class="header">
      <div class="switcher">
        <button type="button" class="icon-btn icon-btn--plain" aria-label="Previous year" @click="shiftYear(-1)"><AppIcon name="back" /></button>
        <h1 class="title">Income {{ year }}</h1>
        <button type="button" class="icon-btn icon-btn--plain" aria-label="Next year" :disabled="year >= thisYear + 1" @click="shiftYear(1)"><AppIcon name="forward" /></button>
      </div>
    </header>

    <section class="summary">
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">Total income {{ year }}</span>
          <span class="summary-value">{{ money(summary.total) }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{{ year === thisYear ? 'Coming in each month' : 'Monthly at year end' }}</span>
          <span class="summary-value">{{ money(recurring) }}</span>
        </div>
      </div>
      <div class="divider" />
      <div class="breakdown">
        <div v-for="b in BREAKDOWN" :key="b.key" class="breakdown-row">
          <AppIcon :name="b.icon" :size="16" />
          <span class="breakdown-label">{{ b.label }}</span>
          <span class="breakdown-value">{{ money(summary[b.key]) }}</span>
        </div>
      </div>
    </section>

    <section v-for="sec in SECTIONS" :key="sec.type" class="group">
      <div class="group-head">
        <div class="titles">
          <h2 class="section-title">{{ sec.title }}</h2>
          <span class="muted small">{{ sec.hint }}</span>
        </div>
        <RouterLink :to="newLink(sec.type)" class="icon-btn icon-btn--small" :aria-label="`Add ${sec.title.toLowerCase()}`">
          <AppIcon name="plus" :size="20" :stroke-width="2.4" />
        </RouterLink>
      </div>

      <template v-if="sec.type === 'salary'">
        <p v-if="!income.salaries.length" class="card empty">{{ sec.empty }}</p>
        <RouterLink v-for="s in income.salaries" :key="s.id" :to="editLink(s.id)" class="card row">
          <span class="icon icon--salary"><AppIcon name="wallet" /></span>
          <span class="text">
            <span class="name">{{ s.name }}</span>
            <span class="muted small">{{ money(s.amount) }} / month · {{ range(s.start, s.end) }}</span>
          </span>
          <span class="amount">{{ money(salaryForYear(s, year)) }}</span>
        </RouterLink>
      </template>

      <template v-else-if="sec.type === 'investment'">
        <p v-if="!income.investments.length" class="card empty">{{ sec.empty }}</p>
        <RouterLink v-for="i in income.investments" :key="i.id" :to="editLink(i.id)" class="card row">
          <span class="icon icon--inv"><AppIcon name="trend" /></span>
          <span class="text">
            <span class="name">{{ i.name }} <span class="tag">{{ pct(i.ratePercent) }} / year</span></span>
            <span class="muted small">{{ money(i.principal) }} invested · {{ money(investmentYearlyReturn(i)) }} / year ({{ money(investmentMonthlyReturn(i)) }} / month)</span>
          </span>
          <span class="amount">{{ money(investmentReturnForYear(i, year)) }}</span>
        </RouterLink>
      </template>

      <template v-else-if="sec.type === 'deal'">
        <div class="card report">
          <span class="report-title">Deals report {{ year }}</span>
          <div class="report-grid">
            <div class="report-item"><span class="muted small">Deals closed</span><span class="report-value">{{ report.count }}</span></div>
            <div class="report-item"><span class="muted small">Return</span><span class="report-value">{{ pct(report.returnPercent) }}</span></div>
            <div class="report-item"><span class="muted small">Invested</span><span class="report-value">{{ money(report.invested) }}</span></div>
            <div class="report-item"><span class="muted small">Earned</span><span class="report-value report-value--good">{{ money(report.earned) }}</span></div>
          </div>
          <span v-if="report.best && report.count > 1" class="muted small">Best: {{ report.best.name }}, {{ pct(dealReturnPercent(report.best)) }}</span>
        </div>
        <p v-if="!income.deals.length" class="card empty">{{ sec.empty }}</p>
        <RouterLink v-for="d in yearDeals" :key="d.id" :to="editLink(d.id)" class="card row">
          <span class="icon icon--deal"><AppIcon name="deal" /></span>
          <span class="text">
            <span class="name">{{ d.name }} <span class="tag">{{ pct(dealReturnPercent(d)) }}</span></span>
            <span class="muted small">{{ money(d.invested) }} in · {{ formatPeriod(dealDays(d)) }} · ends {{ formatDayMonth(d.end) }}</span>
          </span>
          <span class="amount amount--good">+{{ money(d.earned) }}</span>
        </RouterLink>
        <template v-if="openDeals.length">
          <span class="muted small sub-title">Still running after {{ year }}</span>
          <RouterLink v-for="d in openDeals" :key="d.id" :to="editLink(d.id)" class="card row row--soft">
            <span class="icon icon--deal"><AppIcon name="deal" /></span>
            <span class="text">
              <span class="name">{{ d.name }}</span>
              <span class="muted small">{{ money(d.invested) }} in · ends {{ formatDayMonth(d.end) }} {{ d.end.slice(0, 4) }}</span>
            </span>
            <span class="amount muted">+{{ money(d.earned) }}</span>
          </RouterLink>
        </template>
      </template>

      <template v-else>
        <p v-if="!income.projects.length" class="card empty">{{ sec.empty }}</p>
        <RouterLink v-for="p in income.projects" :key="p.id" :to="projectLink(p.id)" class="card row">
          <span class="icon icon--project"><AppIcon name="store" /></span>
          <span class="text">
            <span class="name">{{ p.name }}</span>
            <span class="muted small">{{ money(projectTotals(p, year).earnings) }} earned · {{ money(projectTotals(p, year).costs) }} costs</span>
          </span>
          <span class="amount" :class="projectTotals(p, year).net < 0 ? 'amount--bad' : 'amount--good'">{{ money(projectTotals(p, year).net) }}</span>
        </RouterLink>
      </template>
    </section>
  </main>
</template>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; min-height: 48px; }
.switcher { display: flex; align-items: center; gap: 2px; }
.title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
.summary { background: var(--accent); color: #fff; border-radius: 24px; padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.summary-item { display: flex; flex-direction: column; gap: 4px; }
.summary-label { font-size: 12px; font-weight: 600; opacity: 0.85; }
.summary-value { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
.divider { height: 1px; background: rgba(255, 255, 255, 0.18); }
.breakdown { display: flex; flex-direction: column; gap: 8px; }
.breakdown-row { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
.breakdown-label { flex: 1 1 auto; opacity: 0.9; }
.breakdown-value { font-weight: 800; }
.group { display: flex; flex-direction: column; gap: 8px; }
.group-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.titles { display: flex; flex-direction: column; gap: 2px; }
.icon-btn--small { width: 38px; height: 38px; border-radius: 12px; color: var(--accent); }
.small { font-size: 12px; font-weight: 500; }
.sub-title { font-weight: 700; margin-top: 4px; }
.row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 20px; }
.row--soft { background: var(--line-soft); }
.icon { width: 42px; height: 42px; border-radius: 13px; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.icon--salary { background: var(--accent-soft); color: var(--accent-ink); }
.icon--inv { background: var(--blue-soft); color: var(--blue-ink); }
.icon--deal { background: var(--warn-soft); color: var(--warn-ink); }
.icon--project { background: #ECE6FA; color: #5A3FA8; }
.text { flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.name { font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.tag { font-size: 11px; font-weight: 800; background: var(--line-soft); color: var(--muted); border-radius: 99px; padding: 2px 8px; }
.amount { font-size: 15px; font-weight: 800; white-space: nowrap; }
.amount--good { color: var(--accent-ink); }
.amount--bad { color: var(--danger); }
.report { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 20px; }
.report-title { font-size: 14px; font-weight: 800; }
.report-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.report-item { background: var(--line-soft); border-radius: 14px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
.report-value { font-size: 17px; font-weight: 800; }
.report-value--good { color: var(--accent-ink); }
</style>
