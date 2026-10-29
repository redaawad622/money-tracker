<script setup lang="ts">
import { t } from '../i18n'
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { daysBetween, todayYmd } from '../lib/dates'
import { dealYearlyPercent, formatPeriod, type Deal, type IncomeType } from '../lib/income'
import { formatMoney } from '../lib/money'
import { useIncomeStore, type IncomeInput } from '../stores/income'
import { useSettingsStore } from '../stores/settings'

const route = useRoute()
const router = useRouter()
const income = useIncomeStore()
const { settings } = useSettingsStore()
const money = (n: number) => formatMoney(n, settings.currency)

const editing = typeof route.params.id === 'string' ? income.get(route.params.id) : undefined
const TYPES: IncomeType[] = ['salary', 'investment', 'deal', 'project']
const type: IncomeType = editing?.type ?? (TYPES.includes(route.params.type as IncomeType) ? (route.params.type as IncomeType) : 'salary')

const TITLES: Record<IncomeType, string> = { salary: 'fixed income', investment: 'investment', deal: 'deal', project: 'project' }
const PLACEHOLDERS: Record<IncomeType, string> = {
  salary: 'e.g. Salary, rent from flat',
  investment: 'e.g. Bank certificate, fund',
  deal: 'e.g. Car trade, land share',
  project: 'e.g. Cafe, restaurant',
}

const e = editing as Partial<Record<string, any>> | undefined
const name = shallowRef<string>(e?.name ?? '')
const note = shallowRef<string>(e?.note ?? '')
const amount = shallowRef<number | ''>(e?.amount ?? '')
const principal = shallowRef<number | ''>(e?.principal ?? '')
const ratePercent = shallowRef<number | ''>(e?.ratePercent ?? '')
const invested = shallowRef<number | ''>(e?.invested ?? '')
const earned = shallowRef<number | ''>(e?.earned ?? '')
// A deal's profit is entered as an amount or as a percent of what was invested.
const earnMode = shallowRef<'fixed' | 'percent'>(typeof e?.earnedPercent === 'number' ? 'percent' : 'fixed')
const earnedPercent = shallowRef<number | ''>(e?.earnedPercent ?? '')
const start = shallowRef<string>(e?.start ?? todayYmd())
const end = shallowRef<string>(e?.end ?? '')
const ongoing = shallowRef<boolean>(type !== 'deal' && !e?.end)

const num = (v: number | '') => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const round = (n: number) => Math.round(n * 100) / 100

/** The deal's profit as an amount, however it was entered. */
const profit = computed(() => {
  if (earnMode.value === 'fixed') return num(earned.value)
  const i = num(invested.value)
  const p = num(earnedPercent.value)
  return i !== null && p !== null ? round((i * p) / 100) : null
})

const input = computed<IncomeInput | null>(() => {
  const n = name.value.trim()
  if (!n) return null
  const base = { name: n, note: note.value.trim() || undefined }
  const until = ongoing.value ? null : end.value || null
  if (until && until < start.value) return null
  switch (type) {
    case 'salary': {
      const a = num(amount.value)
      return a && a > 0 && start.value && (ongoing.value || until) ? { ...base, type, amount: round(a), start: start.value, end: until } : null
    }
    case 'investment': {
      const p = num(principal.value)
      const r = num(ratePercent.value)
      return p && p > 0 && r !== null && start.value && (ongoing.value || until)
        ? { ...base, type, principal: round(p), ratePercent: r, start: start.value, end: until }
        : null
    }
    case 'deal': {
      const i = num(invested.value)
      const g = profit.value
      const pct = earnMode.value === 'percent' ? num(earnedPercent.value) ?? undefined : undefined
      return i && i > 0 && g !== null && start.value && end.value && end.value >= start.value
        ? { ...base, type, invested: round(i), earned: round(g), earnedPercent: pct, start: start.value, end: end.value }
        : null
    }
    case 'project':
      return { ...base, type, entries: editing?.type === 'project' ? editing.entries : [] }
  }
})

const preview = computed(() => {
  if (type === 'investment') {
    const p = num(principal.value)
    const r = num(ratePercent.value)
    if (!p || r === null) return ''
    const yearly = (p * r) / 100
    return t('Earns {year} a year, {month} a month.', { year: money(yearly), month: money(yearly / 12) })
  }
  if (type === 'deal') {
    const i = num(invested.value)
    const g = profit.value
    if (!i || g === null || !end.value || end.value < start.value) return ''
    const d = { invested: i, earned: g, start: start.value, end: end.value } as Deal
    const yearly = dealYearlyPercent(d)
    const days = daysBetween(start.value, end.value)
    const total = Math.round((g / i) * 1000) / 10
    const over = t('{pct}% return over {period}', { pct: total, period: formatPeriod(days) })
    const perYear = yearly !== null ? t(', about {pct}% a year', { pct: Math.round(yearly * 10) / 10 }) : ''
    return `${over}${perYear}. ${t('You get back {amount}.', { amount: money(i + g) })}`
  }
  return ''
})

const back = computed(() => (editing?.type === 'project' ? { path: `/income/project/${editing.id}`, query: route.query } : { path: '/income', query: route.query }))

function save() {
  const value = input.value
  if (!value) return
  if (editing) income.update(editing.id, value)
  else {
    const created = income.add(value)
    if (created.type === 'project') return void router.replace({ path: `/income/project/${created.id}`, query: route.query })
  }
  void router.replace(back.value)
}

function remove() {
  if (!editing || !window.confirm(t('Delete "{name}"?', { name: editing.name }))) return
  income.remove(editing.id)
  void router.replace({ path: '/income', query: route.query })
}
</script>

<template>
  <main class="page page--no-tabs">
    <header class="header">
      <RouterLink :to="back" class="icon-btn" :aria-label="t('Close')"><AppIcon name="close" /></RouterLink>
      <h1 class="title">{{ t(`${editing ? 'Edit' : 'New'} ${TITLES[type]}`) }}</h1>
      <div class="spacer" />
    </header>

    <form class="fields" @submit.prevent="save">
      <label class="field">
        {{ t('Name') }}
        <input v-model="name" type="text" :placeholder="t(PLACEHOLDERS[type])" maxlength="40" required />
      </label>

      <label v-if="type === 'salary'" class="field">
        {{ t('Amount every month ({currency})', { currency: settings.currency }) }}
        <input v-model.number="amount" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00" required />
      </label>

      <template v-if="type === 'investment'">
        <label class="field">
          {{ t('Amount invested ({currency})', { currency: settings.currency }) }}
          <input v-model.number="principal" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00" required />
        </label>
        <label class="field">
          {{ t('Yearly return (%)') }}
          <input v-model.number="ratePercent" type="number" inputmode="decimal" step="0.1" :placeholder="t('e.g. {n}', { n: 25 })" required />
        </label>
      </template>

      <template v-if="type === 'deal'">
        <label class="field">
          {{ t('Amount invested ({currency})', { currency: settings.currency }) }}
          <input v-model.number="invested" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00" required />
        </label>
        <div class="field">
          <span class="earn-head">
            {{ t('Amount earned, profit') }}
            <span class="segments" role="group" :aria-label="t('Profit entered as')">
              <button type="button" class="segment" :class="{ 'segment--on': earnMode === 'fixed' }" :aria-pressed="earnMode === 'fixed'" @click="earnMode = 'fixed'">{{ settings.currency }}</button>
              <button type="button" class="segment" :class="{ 'segment--on': earnMode === 'percent' }" :aria-pressed="earnMode === 'percent'" @click="earnMode = 'percent'">%</button>
            </span>
          </span>
          <input v-if="earnMode === 'fixed'" v-model.number="earned" type="number" inputmode="decimal" step="0.01" placeholder="0.00" :aria-label="t('Profit amount')" required />
          <input v-else v-model.number="earnedPercent" type="number" inputmode="decimal" step="0.1" :placeholder="t('e.g. {n}', { n: 20 })" :aria-label="t('Profit, percent of amount invested')" required />
          <span v-if="earnMode === 'percent' && profit !== null" class="muted earn-hint">{{ t('{pct}% of {amount}', { pct: earnedPercent, amount: money(num(invested) ?? 0) }) }} = {{ money(profit) }}</span>
        </div>
      </template>

      <template v-if="type !== 'project'">
        <label class="field">
          {{ type === 'deal' ? t('Start date') : t('Starts') }}
          <input v-model="start" type="date" required />
        </label>
        <label v-if="type !== 'deal'" class="check">
          <input v-model="ongoing" type="checkbox" />
          {{ t('Still going, no end date') }}
        </label>
        <label v-if="type === 'deal' || !ongoing" class="field">
          {{ type === 'deal' ? t('End date') : t('Ends') }}
          <input v-model="end" type="date" :min="start" required />
        </label>
      </template>

      <label class="field">
        {{ t('Note (optional)') }}
        <input v-model="note" type="text" maxlength="80" :placeholder="type === 'project' ? t('e.g. Downtown branch') : ''" />
      </label>

      <p v-if="preview" class="card preview">{{ preview }}</p>
      <p v-if="type === 'deal'" class="muted help">{{ t('Deals count in the yearly report for the year they end.') }}</p>
      <p v-if="type === 'project'" class="muted help">{{ t('After saving, log what the project earns and costs.') }}</p>

      <button type="submit" class="primary-btn" :disabled="!input">
        <AppIcon name="check" :stroke-width="2.4" /> {{ t('Save') }}
      </button>
      <button v-if="editing" type="button" class="danger-btn" @click="remove">
        <AppIcon name="trash" /> {{ t(`Delete ${TITLES[type]}`) }}
      </button>
    </form>
  </main>
</template>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; min-height: 48px; }
.title { font-size: 17px; font-weight: 800; }
.spacer { width: 44px; }
.fields { display: flex; flex-direction: column; gap: 16px; }
.check { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; }
.check input { width: 20px; height: 20px; accent-color: var(--accent); }
.preview { background: var(--accent-soft); border-color: var(--accent-bar); color: var(--accent-ink); font-size: 14px; font-weight: 700; padding: 12px 14px; border-radius: 16px; }
.earn-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.segments { display: grid; grid-template-columns: repeat(2, 48px); gap: 4px; background: #E7EAE4; border-radius: 12px; padding: 3px; }
.segment { height: 30px; border: 0; border-radius: 9px; background: transparent; font-size: 13px; font-weight: 700; color: var(--ink); }
.segment--on { background: var(--card); box-shadow: 0 1px 3px rgba(21, 32, 27, 0.12); }
.earn-hint { font-size: 12px; font-weight: 600; }
.help { font-size: 13px; font-weight: 500; margin-top: -8px; }
</style>
