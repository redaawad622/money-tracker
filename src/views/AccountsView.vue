<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import { ACCOUNT_KINDS } from '../lib/accounts'
import { formatDay } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { useAccountsStore } from '../stores/accounts'
import { useSettingsStore } from '../stores/settings'

const accounts = useAccountsStore()
const { settings } = useSettingsStore()
const money = (n: number) => formatMoney(n, settings.currency)

const kindOf = (kind: string) => ACCOUNT_KINDS.find((k) => k.id === kind)!
const rows = computed(() =>
  [...accounts.accounts]
    .sort((a, b) => Number(!!a.hidden) - Number(!!b.hidden))
    .map((a) => ({ ...a, icon: kindOf(a.kind).icon, label: kindOf(a.kind).label, balance: accounts.balanceOf(a.id) })),
)
const nameOf = (id: string | null) => (id ? accounts.get(id)?.name ?? 'Deleted' : 'Money in')
const recent = computed(() =>
  [...accounts.transfers].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 10),
)
</script>

<template>
  <main class="page page--no-tabs">
    <header class="header">
      <RouterLink to="/" class="icon-btn icon-btn--plain" aria-label="Back to overview"><AppIcon name="back" /></RouterLink>
      <h1 class="title">Accounts</h1>
      <RouterLink to="/accounts/new" class="icon-btn icon-btn--accent" aria-label="Add account"><AppIcon name="plus" /></RouterLink>
    </header>

    <template v-if="accounts.accounts.length">
      <section class="hero">
        <span class="hero-label">Across your accounts</span>
        <span class="hero-amount">{{ money(accounts.total) }}</span>
        <RouterLink to="/transfer" class="hero-btn"><AppIcon name="transfer" :size="18" />Move money</RouterLink>
      </section>

      <section class="card list">
        <RouterLink v-for="a in rows" :key="a.id" :to="`/accounts/${a.id}`" class="row" :class="{ 'row--hidden': a.hidden }">
          <span class="row-icon"><AppIcon :name="a.icon" /></span>
          <span class="row-text">
            <span class="row-name">{{ a.name }}</span>
            <span class="row-sub">{{ a.label }}<template v-if="a.hidden"> · hidden</template></span>
          </span>
          <span class="row-amount" :class="{ 'row-amount--neg': a.balance < 0 }">{{ money(a.balance) }}</span>
        </RouterLink>
      </section>

      <section v-if="recent.length" class="group">
        <h2 class="section-title">Recent transfers</h2>
        <div class="card list">
          <RouterLink v-for="t in recent" :key="t.id" :to="`/transfer/${t.id}`" class="row">
            <span class="row-icon row-icon--move"><AppIcon name="transfer" /></span>
            <span class="row-text">
              <span class="row-name">{{ nameOf(t.from) }} → {{ nameOf(t.to) }}</span>
              <span class="row-sub">{{ formatDay(t.date) }}<template v-if="t.note"> · {{ t.note }}</template></span>
            </span>
            <span class="row-amount">{{ money(t.amount) }}</span>
          </RouterLink>
        </div>
      </section>
    </template>

    <p v-else class="card empty">
      Add where your money sits: cash, a bank account, a card or a wallet like InstaPay or Vodafone Cash. Then pick one when you add an expense, and move money between them without it counting as spending.
    </p>
  </main>
</template>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; min-height: 48px; margin-left: -10px; }
.title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; flex: 1 1 auto; }
.hero { background: var(--accent); color: #fff; border-radius: 24px; padding: 20px; display: flex; flex-direction: column; gap: 4px; }
.hero-label { font-size: 13px; font-weight: 600; opacity: 0.85; }
.hero-amount { font-size: 34px; font-weight: 800; letter-spacing: -0.03em; }
.hero-btn {
  margin-top: 10px; height: 44px; border-radius: 14px; background: rgba(255, 255, 255, 0.16); color: #fff;
  display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; font-weight: 700;
}
.empty { font-size: 14px; font-weight: 500; line-height: 1.5; color: var(--muted); }
.group { display: flex; flex-direction: column; gap: 8px; }
.list { padding: 4px 16px; display: flex; flex-direction: column; }
.row { display: flex; align-items: center; gap: 12px; min-height: 60px; }
.row + .row { border-top: 1px solid var(--line-soft); }
.row--hidden { opacity: 0.55; }
.row-icon {
  width: 40px; height: 40px; border-radius: 12px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center;
  background: var(--accent-soft); color: var(--accent-ink);
}
.row-icon--move { background: var(--blue-soft); color: var(--blue-ink); }
.row-text { flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.row-name { font-size: 15px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-sub { font-size: 12px; font-weight: 500; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-amount { font-size: 15px; font-weight: 700; }
.row-amount--neg { color: var(--warn-ink); }
</style>
