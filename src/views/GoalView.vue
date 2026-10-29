<script setup lang="ts">
import { locale, t } from '../i18n'
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { formatDay, parseYmd, todayYmd } from '../lib/dates'
import { perMonthNeeded, progress, saved } from '../lib/goals'
import { formatMoney } from '../lib/money'
import { useGoalsStore } from '../stores/goals'
import { useSettingsStore } from '../stores/settings'

const route = useRoute()
const router = useRouter()
const goals = useGoalsStore()
const { settings } = useSettingsStore()
const money = (n: number) => formatMoney(n, settings.currency)
const today = todayYmd()
const fullDate = (ymd: string) => parseYmd(ymd).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })

const goal = computed(() => goals.get(String(route.params.id)))
if (!goal.value) void router.replace('/goals')

const pct = computed(() => (goal.value ? Math.round(progress(goal.value) * 100) : 0))
const total = computed(() => (goal.value ? saved(goal.value) : 0))
const perMonth = computed(() => (goal.value ? perMonthNeeded(goal.value, today) : null))
const entries = computed(() => [...(goal.value?.entries ?? [])].sort((a, b) => b.date.localeCompare(a.date)))

const amount = shallowRef<number | ''>('')
const date = shallowRef(today)
const takeOut = shallowRef(false)
const canAdd = computed(() => typeof amount.value === 'number' && amount.value > 0 && date.value !== '')

function addEntry() {
  if (!goal.value || !canAdd.value || typeof amount.value !== 'number') return
  const value = Math.round(amount.value * 100) / 100
  goals.addEntry(goal.value.id, { date: date.value, amount: takeOut.value ? -value : value })
  amount.value = ''
  takeOut.value = false
}

function removeEntry(id: string) {
  if (goal.value && window.confirm(t('Remove this entry?'))) goals.removeEntry(goal.value.id, id)
}
</script>

<template>
  <main v-if="goal" class="page page--no-tabs">
    <header class="header">
      <RouterLink to="/goals" class="icon-btn icon-btn--plain" :aria-label="t('Back to goals')"><AppIcon name="back" /></RouterLink>
      <h1 class="title">{{ goal.name }}</h1>
      <RouterLink :to="`/goals/${goal.id}/edit`" class="icon-btn" :aria-label="t('Edit goal')"><AppIcon name="pencil" /></RouterLink>
    </header>

    <section class="hero">
      <span class="hero-label">{{ t('Saved') }}</span>
      <span class="hero-amount">{{ money(total) }}</span>
      <span class="hero-label">{{ goal.targetDate ? t('of {amount} by {date}', { amount: money(goal.target), date: fullDate(goal.targetDate) }) : t('of {amount}', { amount: money(goal.target) }) }}</span>
      <span class="bar"><span class="bar-fill" :style="{ width: `${pct}%` }" /></span>
      <span class="hero-note">
        <template v-if="pct >= 100">{{ t('Goal reached.') }}</template>
        <template v-else-if="perMonth !== null">{{ t('{amount} a month gets you there on time.', { amount: money(perMonth) }) }} {{ t('{amount} to go.', { amount: money(goal.target - total) }) }}</template>
        <template v-else>{{ t('{amount} to go.', { amount: money(goal.target - total) }) }}</template>
      </span>
    </section>

    <form class="card add" @submit.prevent="addEntry">
      <div class="segments" role="group" :aria-label="t('Put aside or take out')">
        <button type="button" class="segment" :class="{ 'segment--on': !takeOut }" :aria-pressed="!takeOut" @click="takeOut = false">{{ t('Put aside') }}</button>
        <button type="button" class="segment" :class="{ 'segment--on': takeOut }" :aria-pressed="takeOut" @click="takeOut = true">{{ t('Take out') }}</button>
      </div>
      <div class="add-row">
        <label class="field add-amount">
          {{ t('Amount ({currency})', { currency: settings.currency }) }}
          <input v-model.number="amount" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00" />
        </label>
        <label class="field add-date">
          {{ t('Date') }}
          <input v-model="date" type="date" :max="today" />
        </label>
      </div>
      <button type="submit" class="primary-btn" :disabled="!canAdd">
        <AppIcon :name="takeOut ? 'down' : 'plus'" :stroke-width="2.4" /> {{ takeOut ? t('Take out') : t('Put aside') }}
      </button>
    </form>

    <section v-if="entries.length" class="card list">
      <div v-for="e in entries" :key="e.id" class="row">
        <span class="row-date">{{ formatDay(e.date) }}</span>
        <span class="row-amount" :class="{ 'row-amount--out': e.amount < 0 }">{{ e.amount < 0 ? '−' : '+' }}{{ money(Math.abs(e.amount)) }}</span>
        <button type="button" class="icon-btn icon-btn--plain row-del" :aria-label="t('Remove entry')" @click="removeEntry(e.id)"><AppIcon name="trash" :size="18" /></button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; gap: 4px; min-height: 48px; margin-inline-start: -10px; }
.title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hero { background: var(--accent); color: #fff; border-radius: 24px; padding: 20px; display: flex; flex-direction: column; gap: 6px; }
.hero-label { font-size: 13px; font-weight: 600; opacity: 0.85; }
.hero-amount { font-size: 34px; font-weight: 800; letter-spacing: -0.03em; }
.hero-note { font-size: 13px; font-weight: 600; }
.bar { height: 10px; background: rgba(255, 255, 255, 0.22); border-radius: 99px; overflow: hidden; margin: 6px 0 2px; }
.bar-fill { display: block; height: 100%; background: #fff; border-radius: 99px; }
.add { display: flex; flex-direction: column; gap: 14px; }
.segments { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; background: #E7EAE4; border-radius: 14px; padding: 4px; }
.segment { height: 38px; border: 0; border-radius: 10px; background: transparent; font-size: 14px; font-weight: 700; }
.segment--on { background: var(--card); box-shadow: 0 1px 3px rgba(21, 32, 27, 0.12); }
.add-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; }
.list { padding: 4px 16px; }
.row { display: flex; align-items: center; gap: 12px; min-height: 52px; }
.row + .row { border-top: 1px solid var(--line-soft); }
.row-date { flex: 1 1 auto; font-size: 14px; font-weight: 600; color: var(--muted); }
.row-amount { font-size: 15px; font-weight: 700; color: var(--accent-ink); }
.row-amount--out { color: var(--warn-ink); }
.row-del { color: var(--muted); margin-inline-end: -10px; }
</style>
