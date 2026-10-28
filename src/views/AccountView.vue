<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { categoryById } from '../data/categories'
import { ACCOUNT_KINDS } from '../lib/accounts'
import { formatDay } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { useAccountsStore } from '../stores/accounts'
import { useExpensesStore } from '../stores/expenses'
import { useSettingsStore } from '../stores/settings'

const route = useRoute()
const router = useRouter()
const accounts = useAccountsStore()
const expenses = useExpensesStore()
const { settings } = useSettingsStore()
const money = (n: number) => formatMoney(n, settings.currency)

const account = computed(() => accounts.get(String(route.params.id)))
if (!account.value) void router.replace('/accounts')

const kind = computed(() => ACCOUNT_KINDS.find((k) => k.id === account.value?.kind)!)
const current = computed(() => (account.value ? accounts.balanceOf(account.value.id) : 0))
const since = computed(() => (account.value ? new Date(account.value.startAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''))

const nameOf = (id: string | null) => (id ? accounts.get(id)?.name ?? 'Deleted account' : 'Money in')
const rows = computed(() =>
  (account.value ? accounts.movementsOf(account.value.id) : []).slice(0, 60).map((m) => {
    if (m.kind === 'expense') {
      const e = expenses.get(m.id)
      const c = e ? categoryById(e.categoryId) : null
      return { ...m, to: `/expense/${m.id}`, title: e?.note || c?.name || 'Expense', sub: [formatDay(m.date), e?.store].filter(Boolean).join(' · ') }
    }
    const t = m.transfer!
    const title = m.kind === 'in' ? (t.from ? `From ${nameOf(t.from)}` : 'Money in') : `To ${nameOf(t.to)}`
    return { ...m, to: `/transfer/${t.id}`, title: t.note || title, sub: [formatDay(m.date), t.note ? title : ''].filter(Boolean).join(' · ') }
  }),
)

const editingBalance = shallowRef(false)
const newBalance = shallowRef<number | ''>('')

function startSetBalance() {
  newBalance.value = current.value
  editingBalance.value = true
}

function saveBalance() {
  if (!account.value || typeof newBalance.value !== 'number') return
  accounts.setBalance(account.value.id, Math.round(newBalance.value * 100) / 100)
  editingBalance.value = false
}
</script>

<template>
  <main v-if="account" class="page page--no-tabs">
    <header class="header">
      <RouterLink to="/accounts" class="icon-btn icon-btn--plain" aria-label="Back to accounts"><AppIcon name="back" /></RouterLink>
      <h1 class="title">{{ account.name }}</h1>
      <RouterLink :to="`/accounts/${account.id}/edit`" class="icon-btn" aria-label="Edit account"><AppIcon name="pencil" /></RouterLink>
    </header>

    <section class="hero">
      <span class="hero-label">{{ kind.label }} · balance</span>
      <span class="hero-amount">{{ money(current) }}</span>
      <span class="hero-label">Counted from {{ money(account.startBalance) }} on {{ since }}</span>
      <div class="hero-actions">
        <RouterLink :to="{ path: '/transfer', query: { to: account.id } }" class="hero-btn"><AppIcon name="transfer" :size="18" />Move money</RouterLink>
        <button type="button" class="hero-btn" @click="startSetBalance"><AppIcon name="pencil" :size="18" />Set balance</button>
      </div>
    </section>

    <form v-if="editingBalance" class="card set" @submit.prevent="saveBalance">
      <label class="field">
        What's in {{ account.name }} right now ({{ settings.currency }})
        <input v-model.number="newBalance" type="number" inputmode="decimal" step="0.01" />
      </label>
      <p class="muted help">Use this when the balance here doesn't match your real one. Only what happens from now on changes it.</p>
      <div class="set-actions">
        <button type="button" class="secondary-btn" @click="editingBalance = false">Cancel</button>
        <button type="submit" class="secondary-btn secondary-btn--main" :disabled="typeof newBalance !== 'number'">Save</button>
      </div>
    </form>

    <p v-if="!rows.length" class="card empty">Nothing yet. Pick {{ account.name }} under "Paid with" when you add an expense.</p>
    <section v-else class="card list">
      <RouterLink v-for="r in rows" :key="`${r.kind}:${r.id}`" :to="r.to" class="row">
        <span class="row-icon" :class="`row-icon--${r.kind}`"><AppIcon :name="r.kind === 'expense' ? 'shopping' : 'transfer'" :size="18" /></span>
        <span class="row-text">
          <span class="row-name">{{ r.title }}</span>
          <span class="row-sub">{{ r.sub }}</span>
        </span>
        <span class="row-amount" :class="{ 'row-amount--in': r.amount > 0 }">{{ r.amount > 0 ? '+' : '−' }}{{ money(Math.abs(r.amount)) }}</span>
      </RouterLink>
    </section>
  </main>
</template>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; gap: 4px; min-height: 48px; margin-left: -10px; }
.title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hero { background: var(--accent); color: #fff; border-radius: 24px; padding: 20px; display: flex; flex-direction: column; gap: 4px; }
.hero-label { font-size: 13px; font-weight: 600; opacity: 0.85; }
.hero-amount { font-size: 34px; font-weight: 800; letter-spacing: -0.03em; }
.hero-actions { margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.hero-btn {
  height: 44px; border: 0; border-radius: 14px; background: rgba(255, 255, 255, 0.16); color: #fff;
  display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; font-weight: 700;
}
.set { display: flex; flex-direction: column; gap: 12px; }
.help { font-size: 12px; font-weight: 500; line-height: 1.45; }
.set-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.secondary-btn { height: 46px; border: 1px solid var(--line); border-radius: 14px; background: var(--card); color: var(--accent-ink); font-weight: 700; }
.secondary-btn--main { background: var(--accent); border-color: var(--accent); color: #fff; }
.secondary-btn:disabled { opacity: 0.5; }
.empty { font-size: 14px; font-weight: 500; line-height: 1.5; color: var(--muted); }
.list { padding: 4px 16px; display: flex; flex-direction: column; }
.row { display: flex; align-items: center; gap: 12px; min-height: 58px; }
.row + .row { border-top: 1px solid var(--line-soft); }
.row-icon { width: 36px; height: 36px; border-radius: 11px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; background: var(--warn-soft); color: var(--warn-ink); }
.row-icon--in { background: var(--accent-soft); color: var(--accent-ink); }
.row-icon--out { background: var(--blue-soft); color: var(--blue-ink); }
.row-text { flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.row-name { font-size: 15px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-sub { font-size: 12px; font-weight: 500; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-amount { font-size: 15px; font-weight: 700; }
.row-amount--in { color: var(--accent-ink); }
</style>
