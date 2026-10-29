<script setup lang="ts">
import { t } from '../i18n'
import { computed } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import SubscriptionCard from '../components/SubscriptionCard.vue'
import ToggleSwitch from '../components/ToggleSwitch.vue'
import { addMonthsToKey, formatShortMonth, monthKeyOf, todayYmd } from '../lib/dates'
import { formatMoney, sumMoney } from '../lib/money'
import { monthlyEquivalent } from '../lib/subscriptions'
import { useSettingsStore } from '../stores/settings'
import { useSubscriptionsStore } from '../stores/subscriptions'

const subs = useSubscriptionsStore()
const { settings } = useSettingsStore()
const today = todayYmd()
const thisMonth = monthKeyOf(today)
const money = (n: number) => formatMoney(n, settings.currency)

const monthly = computed(() => subs.subscriptions.filter((s) => s.intervalMonths === 1))
const quarterly = computed(() => subs.subscriptions.filter((s) => s.intervalMonths === 3))

const dueThisMonth = computed(() => subs.totalDueInMonth(thisMonth))
const averagePerMonth = computed(() => sumMoney(subs.subscriptions.map(monthlyEquivalent)))

const comingUp = computed(() =>
  [1, 2, 3].map((n) => {
    const key = addMonthsToKey(thisMonth, n)
    const due = subs.dueInMonth(key)
    const hasQuarterly = due.some((d) => d.sub.intervalMonths === 3)
    return {
      key,
      name: formatShortMonth(key),
      total: money(sumMoney(due.map((d) => d.sub.amount))),
      what: due.length === 0 ? t('Nothing due') : due.length === 1 ? t('1 payment') : t('{n} payments', { n: due.length }),
      highlight: hasQuarterly,
    }
  }),
)
</script>

<template>
  <main class="page">
    <header class="header">
      <div class="titles">
        <h1 class="title">{{ t('Fixed subscriptions') }}</h1>
        <span class="muted sub">{{ t('Tracked apart from daily spending') }}</span>
      </div>
      <RouterLink to="/fixed/new" class="icon-btn icon-btn--accent" :aria-label="t('Add fixed payment')">
        <AppIcon name="plus" :stroke-width="2.4" />
      </RouterLink>
    </header>

    <section class="summary">
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">{{ t('Due this month') }}</span>
          <span class="summary-value">{{ money(dueThisMonth) }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{{ t('Average per month') }}</span>
          <span class="summary-value">{{ money(averagePerMonth) }}</span>
        </div>
      </div>
      <div class="divider" />
      <div class="toggle-row">
        <div class="toggle-text">
          <span class="toggle-title">{{ t('Count in monthly budget') }}</span>
          <span class="summary-label">{{ settings.includeSubscriptionsInBudget ? t('Taken off your budget when due') : t('Kept outside your budget') }}</span>
        </div>
        <ToggleSwitch v-model="settings.includeSubscriptionsInBudget" :label="t('Count in monthly budget')" />
      </div>
    </section>

    <p v-if="subs.subscriptions.length === 0" class="card empty">
      {{ t('No fixed subscriptions yet. Tap + to add your monthly or every-3-months payment.') }}
    </p>

    <section v-if="monthly.length" class="group">
      <h2 class="section-title">{{ t('Every month') }}</h2>
      <SubscriptionCard
        v-for="s in monthly" :key="s.id" :sub="s" :today="today" :currency="settings.currency"
        @set-paid="(date, paid) => subs.setPaid(s.id, date, paid)"
      />
    </section>

    <section v-if="quarterly.length" class="group">
      <h2 class="section-title">{{ t('Every 3 months') }}</h2>
      <SubscriptionCard
        v-for="s in quarterly" :key="s.id" :sub="s" :today="today" :currency="settings.currency"
        @set-paid="(date, paid) => subs.setPaid(s.id, date, paid)"
      />
    </section>

    <section v-if="subs.subscriptions.length" class="group">
      <h2 class="section-title">{{ t('Coming up') }}</h2>
      <div class="months">
        <div v-for="m in comingUp" :key="m.key" class="card month" :class="{ 'month--q': m.highlight }">
          <span class="muted month-name">{{ m.name }}</span>
          <span class="month-total">{{ m.total }}</span>
          <span class="muted month-what">{{ m.what }}</span>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 48px; }
.titles { display: flex; flex-direction: column; gap: 2px; }
.title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
.sub { font-size: 13px; font-weight: 600; }
.summary { background: var(--ink); color: #fff; border-radius: 24px; padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.summary-item { display: flex; flex-direction: column; gap: 4px; }
.summary-label { font-size: 12px; font-weight: 600; color: #C9D2CD; }
.summary-value { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
.divider { height: 1px; background: rgba(255, 255, 255, 0.14); }
.toggle-row { display: flex; align-items: center; gap: 12px; }
.toggle-text { flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px; }
.toggle-title { font-size: 14px; font-weight: 700; }
.group { display: flex; flex-direction: column; gap: 8px; }
.months { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.month { padding: 10px 12px; border-radius: 16px; display: flex; flex-direction: column; gap: 4px; }
.month--q { background: var(--blue-soft); border-color: #C7D4F5; }
.month-name { font-size: 12px; font-weight: 700; }
.month-total { font-size: 16px; font-weight: 800; }
.month-what { font-size: 11px; font-weight: 600; }
</style>
