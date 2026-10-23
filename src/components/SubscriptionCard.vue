<script setup lang="ts">
import { computed } from 'vue'
import { addMonths, daysBetween, formatDayMonth, parseYmd } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { lastDueDate, monthlyEquivalent, nextDueDate, type Subscription } from '../lib/subscriptions'
import AppIcon from './AppIcon.vue'

const { sub, today, currency } = defineProps<{ sub: Subscription; today: string; currency: string }>()
const emit = defineEmits<{ setPaid: [dueDate: string, paid: boolean] }>()

const money = (n: number) => formatMoney(n, currency)
const isQuarterly = computed(() => sub.intervalMonths === 3)

const last = computed(() => lastDueDate(sub, today))
const lastPaid = computed(() => last.value !== null && sub.paid.includes(last.value))
/** First due date after today. */
const upcoming = computed(() => {
  const d = nextDueDate(sub, today)
  return d === today ? addMonths(d, sub.intervalMonths) : d
})
const daysToUpcoming = computed(() => daysBetween(today, upcoming.value))

const schedule = computed(() => {
  const day = parseYmd(sub.anchor).getDate()
  return isQuarterly.value ? `Every 3 months · on day ${day}` : `Every month · on day ${day}`
})

const cycle = computed(() => {
  if (!last.value) return null
  const total = daysBetween(last.value, upcoming.value)
  const done = daysBetween(last.value, today)
  return { pct: total ? Math.round((done / total) * 100) : 0, done, total }
})

function inDays(n: number) {
  return n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`
}
</script>

<template>
  <article class="card sub">
    <RouterLink :to="`/fixed/${sub.id}`" class="sub-head">
      <span class="icon" :class="isQuarterly ? 'icon--q' : 'icon--m'">
        <AppIcon :name="isQuarterly ? 'calendar' : 'repeat'" />
      </span>
      <span class="text">
        <span class="name">{{ sub.name }}</span>
        <span class="muted small">
          {{ schedule }}<template v-if="isQuarterly"> · ≈ {{ money(monthlyEquivalent(sub)) }} / month</template>
        </span>
      </span>
      <span class="amount">{{ money(sub.amount) }}</span>
    </RouterLink>

    <div v-if="isQuarterly && cycle" class="cycle">
      <div class="bar" role="img" :aria-label="`${cycle.done} of ${cycle.total} days of this period passed`">
        <div class="bar-fill" :style="{ width: `${cycle.pct}%` }" />
      </div>
    </div>

    <div class="sub-foot">
      <template v-if="last">
        <button v-if="lastPaid" type="button" class="pill pill--paid" :aria-label="`Paid ${formatDayMonth(last)}, tap to undo`" @click="emit('setPaid', last, false)">
          <AppIcon name="check" :size="13" :stroke-width="2.6" /> Paid {{ formatDayMonth(last) }}
        </button>
        <button v-else type="button" class="pill pill--due" @click="emit('setPaid', last, true)">
          Due {{ formatDayMonth(last) }} · Mark paid
        </button>
      </template>
      <span v-else class="muted small">Starts {{ formatDayMonth(sub.anchor) }}</span>
      <span class="next" :class="{ 'next--q': isQuarterly }">Next: {{ formatDayMonth(upcoming) }} · {{ inDays(daysToUpcoming) }}</span>
    </div>
  </article>
</template>

<style scoped>
.sub { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 20px; }
.sub-head { display: flex; align-items: center; gap: 12px; }
.icon { width: 42px; height: 42px; border-radius: 13px; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.icon--m { background: #ECE6FA; color: #5A3FA8; }
.icon--q { background: var(--blue-soft); color: var(--blue-ink); }
.text { flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.name { font-size: 15px; font-weight: 700; }
.small { font-size: 12px; font-weight: 500; }
.amount { font-size: 15px; font-weight: 800; }
.bar { height: 8px; background: var(--line-soft); border-radius: 99px; overflow: hidden; }
.bar-fill { height: 100%; background: var(--blue); border-radius: 99px; }
.sub-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; border-radius: 99px; padding: 0 12px; min-height: 32px; border: 0; }
.pill--paid { background: var(--accent-soft); color: var(--accent-ink); }
.pill--due { background: var(--warn-soft); color: var(--warn-ink); }
.next { font-size: 12px; font-weight: 600; color: var(--muted); }
.next--q { color: var(--blue-ink); font-weight: 700; }
</style>
