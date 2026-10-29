<script setup lang="ts">
import { locale, t } from '../i18n'
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { formatDay, todayYmd } from '../lib/dates'
import { projectEntriesIn, projectTotals } from '../lib/income'
import { formatMoney, sumMoney } from '../lib/money'
import { useIncomeStore } from '../stores/income'
import { useSettingsStore } from '../stores/settings'

const route = useRoute()
const router = useRouter()
const income = useIncomeStore()
const { settings } = useSettingsStore()
const money = (n: number) => formatMoney(n, settings.currency)
const thisYear = Number(todayYmd().slice(0, 4))

const project = computed(() => {
  const p = income.get(String(route.params.id))
  return p?.type === 'project' ? p : undefined
})
const year = computed(() => {
  const q = Number(route.query.year)
  return Number.isInteger(q) && q > 1900 && q < 3000 ? q : thisYear
})
function shiftYear(n: number) {
  const next = year.value + n
  void router.replace({ query: { ...route.query, year: next === thisYear ? undefined : String(next) } })
}

const totals = computed(() => (project.value ? projectTotals(project.value, year.value) : { earnings: 0, costs: 0, net: 0 }))
const allTime = computed(() => sumMoney(project.value?.entries.map((e) => e.amount) ?? []))

/** This year's entries, newest month first, with each month's net. */
const months = computed(() => {
  if (!project.value) return []
  const groups = new Map<string, typeof project.value.entries>()
  for (const e of [...projectEntriesIn(project.value, year.value)].sort((a, b) => b.date.localeCompare(a.date))) {
    const key = e.date.slice(0, 7)
    const list = groups.get(key)
    if (list) list.push(e)
    else groups.set(key, [e])
  }
  return [...groups].map(([key, entries]) => {
    const [y, m] = key.split('-').map(Number)
    return { key, label: new Date(y, m - 1, 1).toLocaleDateString(locale(), { month: 'long' }), entries, net: sumMoney(entries.map((e) => e.amount)) }
  })
})

const kind = shallowRef<'earning' | 'cost'>('earning')
const amount = shallowRef<number | ''>('')
const date = shallowRef(todayYmd())
const note = shallowRef('')
const canAdd = computed(() => typeof amount.value === 'number' && amount.value > 0 && date.value !== '')

function add() {
  if (!project.value || !canAdd.value || typeof amount.value !== 'number') return
  const value = Math.round(amount.value * 100) / 100
  income.addEntry(project.value.id, { date: date.value, amount: kind.value === 'cost' ? -value : value, note: note.value.trim() })
  amount.value = ''
  note.value = ''
}

function removeEntry(id: string) {
  if (project.value && window.confirm(t('Delete this entry?'))) income.removeEntry(project.value.id, id)
}
</script>

<template>
  <main class="page page--no-tabs">
    <header class="header">
      <RouterLink :to="{ path: '/income', query: $route.query }" class="icon-btn" :aria-label="t('Back')"><AppIcon name="back" /></RouterLink>
      <h1 class="title">{{ project?.name ?? t('Project') }}</h1>
      <RouterLink v-if="project" :to="{ path: `/income/${project.id}`, query: $route.query }" class="icon-btn" :aria-label="t('Edit project')"><AppIcon name="pencil" /></RouterLink>
      <div v-else class="spacer" />
    </header>

    <p v-if="!project" class="card empty">{{ t('This project no longer exists.') }}</p>
    <template v-else>
      <section class="summary">
        <div class="year">
          <button type="button" class="year-btn" :aria-label="t('Previous year')" @click="shiftYear(-1)"><AppIcon name="back" :size="18" /></button>
          <span class="summary-label">{{ t('Net profit {year}', { year }) }}</span>
          <button type="button" class="year-btn" :aria-label="t('Next year')" :disabled="year >= thisYear" @click="shiftYear(1)"><AppIcon name="forward" :size="18" /></button>
        </div>
        <span class="summary-value">{{ money(totals.net) }}</span>
        <div class="stats">
          <div class="stat"><span class="summary-label">{{ t('Earned') }}</span><span class="stat-value">{{ money(totals.earnings) }}</span></div>
          <div class="stat"><span class="summary-label">{{ t('Costs') }}</span><span class="stat-value">{{ money(totals.costs) }}</span></div>
        </div>
        <span v-if="project.note" class="summary-label">{{ project.note }}</span>
        <span class="summary-label">{{ t('All time: {amount}', { amount: money(allTime) }) }}</span>
      </section>

      <form class="card add" @submit.prevent="add">
        <div class="segments">
          <button type="button" class="segment" :class="{ 'segment--on': kind === 'earning' }" :aria-pressed="kind === 'earning'" @click="kind = 'earning'">
            <AppIcon name="up" :size="16" /> {{ t('Earning') }}
          </button>
          <button type="button" class="segment" :class="{ 'segment--on': kind === 'cost' }" :aria-pressed="kind === 'cost'" @click="kind = 'cost'">
            <AppIcon name="down" :size="16" /> {{ t('Cost') }}
          </button>
        </div>
        <div class="add-row">
          <label class="field">
            {{ t('Amount ({currency})', { currency: settings.currency }) }}
            <input v-model.number="amount" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00" />
          </label>
          <label class="field">
            {{ t('Date') }}
            <input v-model="date" type="date" />
          </label>
        </div>
        <label class="field">
          {{ t('Note (optional)') }}
          <input v-model="note" type="text" maxlength="60" :placeholder="kind === 'cost' ? t('e.g. Rent, supplies, staff') : t('e.g. Week sales')" />
        </label>
        <button type="submit" class="primary-btn" :disabled="!canAdd">
          <AppIcon name="plus" :stroke-width="2.4" /> {{ kind === 'cost' ? t('Add cost') : t('Add earning') }}
        </button>
      </form>

      <p v-if="!months.length" class="card empty">{{ t('Nothing logged for {year} yet.', { year }) }}</p>
      <section v-for="m in months" :key="m.key" class="group">
        <div class="group-head">
          <h2 class="section-title">{{ m.label }}</h2>
          <span class="month-net" :class="m.net < 0 ? 'bad' : 'good'">{{ money(m.net) }}</span>
        </div>
        <div class="card list">
          <div v-for="e in m.entries" :key="e.id" class="entry">
            <span class="entry-icon" :class="e.amount < 0 ? 'entry-icon--cost' : 'entry-icon--earn'">
              <AppIcon :name="e.amount < 0 ? 'down' : 'up'" :size="16" />
            </span>
            <span class="entry-text">
              <span class="entry-note">{{ e.note || (e.amount < 0 ? t('Cost') : t('Earning')) }}</span>
              <span class="muted entry-date">{{ formatDay(e.date) }}</span>
            </span>
            <span class="entry-amount" :class="e.amount < 0 ? 'bad' : 'good'">{{ e.amount < 0 ? '−' : '+' }}{{ money(Math.abs(e.amount)) }}</span>
            <button type="button" class="icon-btn icon-btn--plain entry-del" :aria-label="t('Delete entry')" @click="removeEntry(e.id)"><AppIcon name="trash" :size="18" /></button>
          </div>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 48px; }
.title { font-size: 17px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.spacer { width: 44px; }
.summary { background: #5A3FA8; color: #fff; border-radius: 24px; padding: 18px; display: flex; flex-direction: column; gap: 8px; }
.year { display: flex; align-items: center; gap: 4px; }
.year-btn { width: 32px; height: 32px; border: 0; border-radius: 10px; background: rgba(255, 255, 255, 0.14); color: #fff; display: inline-flex; align-items: center; justify-content: center; }
.year-btn:disabled { opacity: 0.35; cursor: default; }
.summary-label { font-size: 12px; font-weight: 600; opacity: 0.85; }
.summary-value { font-size: 32px; font-weight: 800; letter-spacing: -0.03em; }
.stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.stat { background: rgba(255, 255, 255, 0.14); border-radius: 14px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
.stat-value { font-size: 16px; font-weight: 800; }
.add { display: flex; flex-direction: column; gap: 12px; }
.add-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.add-row .field input { min-width: 0; width: 100%; }
.segments { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; background: #E7EAE4; border-radius: 14px; padding: 4px; }
.segment { height: 40px; border: 0; border-radius: 10px; background: transparent; font-size: 14px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.segment--on { background: var(--card); box-shadow: 0 1px 3px rgba(21, 32, 27, 0.12); }
.group { display: flex; flex-direction: column; gap: 8px; }
.group-head { display: flex; align-items: center; justify-content: space-between; }
.month-net { font-size: 14px; font-weight: 800; }
.list { padding: 4px 6px 4px 14px; display: flex; flex-direction: column; }
.entry { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--line-soft); }
.entry:last-child { border-bottom: 0; }
.entry-icon { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.entry-icon--earn { background: var(--accent-soft); color: var(--accent-ink); }
.entry-icon--cost { background: #FDF1F0; color: var(--danger); }
.entry-text { flex: 1 1 auto; display: flex; flex-direction: column; min-width: 0; }
.entry-note { font-size: 14px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.entry-date { font-size: 12px; font-weight: 500; }
.entry-amount { font-size: 14px; font-weight: 800; white-space: nowrap; }
.entry-del { width: 38px; height: 38px; color: var(--faint); }
.good { color: var(--accent-ink); }
.bad { color: var(--danger); }
</style>
