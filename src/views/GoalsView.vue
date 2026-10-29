<script setup lang="ts">
import { locale, t } from '../i18n'
import { computed } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import { parseYmd, todayYmd } from '../lib/dates'
import { perMonthNeeded, progress, saved } from '../lib/goals'
import { formatMoney } from '../lib/money'
import { useGoalsStore } from '../stores/goals'
import { useSettingsStore } from '../stores/settings'

const goals = useGoalsStore()
const { settings } = useSettingsStore()
const money = (n: number) => formatMoney(n, settings.currency)
const today = todayYmd()

const rows = computed(() =>
  goals.goals.map((g) => {
    const perMonth = perMonthNeeded(g, today)
    const pct = Math.round(progress(g) * 100)
    let detail = t('{saved} of {target}', { saved: money(saved(g)), target: money(g.target) })
    if (pct >= 100) detail = t('Reached · {amount}', { amount: money(saved(g)) })
    else if (perMonth !== null) detail += ` · ${t('{amount} a month to {date}', { amount: money(perMonth), date: parseYmd(g.targetDate!).toLocaleDateString(locale(), { month: 'short', year: 'numeric' }) })}`
    else if (g.targetDate && g.targetDate < today) detail += ` · ${t('date passed')}`
    return { id: g.id, name: g.name, pct, detail, done: pct >= 100 }
  }),
)
</script>

<template>
  <main class="page page--no-tabs">
    <header class="header">
      <RouterLink to="/" class="icon-btn icon-btn--plain" :aria-label="t('Back to overview')"><AppIcon name="back" /></RouterLink>
      <h1 class="title">{{ t('Savings goals') }}</h1>
      <RouterLink to="/goals/new" class="icon-btn icon-btn--accent" :aria-label="t('Add goal')"><AppIcon name="plus" /></RouterLink>
    </header>

    <section v-if="goals.goals.length" class="hero">
      <span class="hero-label">{{ t('Put aside for your goals') }}</span>
      <span class="hero-amount">{{ money(goals.totalSaved) }}</span>
      <span class="hero-label">{{ t('Kept apart from your spending budget') }}</span>
    </section>

    <p v-if="!goals.goals.length" class="card empty">
      {{ t('Save toward something: a car, Eid, school fees, an emergency fund. Tap + to add a goal, then put money aside for it whenever you can.') }}
    </p>

    <RouterLink v-for="g in rows" :key="g.id" :to="`/goals/${g.id}`" class="card goal">
      <span class="goal-top">
        <span class="goal-icon" :class="{ 'goal-icon--done': g.done }"><AppIcon :name="g.done ? 'check' : 'target'" /></span>
        <span class="goal-name">{{ g.name }}</span>
        <span class="goal-pct">{{ g.pct }}%</span>
      </span>
      <span class="bar"><span class="bar-fill" :style="{ width: `${g.pct}%` }" /></span>
      <span class="goal-detail">{{ g.detail }}</span>
    </RouterLink>
  </main>
</template>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; min-height: 48px; margin-inline-start: -10px; }
.title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; flex: 1 1 auto; }
.hero { background: var(--accent); color: #fff; border-radius: 24px; padding: 20px; display: flex; flex-direction: column; gap: 4px; }
.hero-label { font-size: 13px; font-weight: 600; opacity: 0.85; }
.hero-amount { font-size: 34px; font-weight: 800; letter-spacing: -0.03em; }
.empty { font-size: 14px; font-weight: 500; line-height: 1.5; color: var(--muted); }
.goal { display: flex; flex-direction: column; gap: 10px; }
.goal-top { display: flex; align-items: center; gap: 12px; }
.goal-icon {
  width: 40px; height: 40px; border-radius: 12px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center;
  background: var(--blue-soft); color: var(--blue-ink);
}
.goal-icon--done { background: var(--accent-soft); color: var(--accent-ink); }
.goal-name { flex: 1 1 auto; font-size: 16px; font-weight: 700; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.goal-pct { font-size: 15px; font-weight: 800; }
.bar { height: 8px; background: var(--line-soft); border-radius: 99px; overflow: hidden; }
.bar-fill { display: block; height: 100%; background: var(--accent); border-radius: 99px; }
.goal-detail { font-size: 13px; font-weight: 600; color: var(--muted); }
</style>
