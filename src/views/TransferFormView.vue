<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { todayYmd } from '../lib/dates'
import { useAccountsStore } from '../stores/accounts'
import { useSettingsStore } from '../stores/settings'

const route = useRoute()
const router = useRouter()
const accounts = useAccountsStore()
const { settings } = useSettingsStore()

const editing = typeof route.params.id === 'string' ? accounts.getTransfer(route.params.id) : undefined
const queryTo = typeof route.query.to === 'string' && accounts.get(route.query.to) ? route.query.to : undefined

// '' in "from" means money coming in from outside (a salary, a gift).
const options = computed(() => accounts.accounts.filter((a) => !a.hidden || a.id === editing?.from || a.id === editing?.to))
const to = shallowRef(editing?.to ?? queryTo ?? options.value[0]?.id ?? '')
const from = shallowRef(editing ? editing.from ?? '' : options.value.find((a) => a.id !== to.value)?.id ?? '')
const amount = shallowRef<number | ''>(editing?.amount ?? '')
const date = shallowRef(editing?.date ?? todayYmd())
const note = shallowRef(editing?.note ?? '')

const canSave = computed(
  () => to.value !== '' && from.value !== to.value && typeof amount.value === 'number' && amount.value > 0 && date.value !== '',
)

function close() {
  if (window.history.length > 1) router.back()
  else void router.replace('/accounts')
}

function save() {
  if (!canSave.value || typeof amount.value !== 'number') return
  const input = { from: from.value || null, to: to.value, amount: Math.round(amount.value * 100) / 100, date: date.value, note: note.value.trim() }
  if (editing) accounts.updateTransfer(editing.id, input)
  else accounts.addTransfer(input)
  close()
}

function remove() {
  if (!editing || !window.confirm('Delete this transfer?')) return
  accounts.removeTransfer(editing.id)
  close()
}
</script>

<template>
  <main class="page page--no-tabs">
    <header class="header">
      <button type="button" class="icon-btn" aria-label="Close" @click="close"><AppIcon name="close" /></button>
      <h1 class="title">{{ editing ? 'Edit transfer' : 'Move money' }}</h1>
      <div class="spacer" />
    </header>

    <p v-if="!options.length" class="card empty">
      Add an account first. <RouterLink to="/accounts/new" class="link">Add account</RouterLink>
    </p>
    <form v-else class="fields" @submit.prevent="save">
      <label class="field">
        From
        <select v-model="from">
          <option value="">Money in (salary, gift…)</option>
          <option v-for="a in options" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
      </label>
      <label class="field">
        To
        <select v-model="to">
          <option v-for="a in options" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
      </label>
      <p v-if="from === to" class="warn">Pick two different accounts.</p>
      <label class="field">
        Amount ({{ settings.currency }})
        <input v-model.number="amount" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00" required />
      </label>
      <label class="field">
        Date
        <input v-model="date" type="date" required />
      </label>
      <label class="field">
        Note (optional)
        <input v-model="note" type="text" maxlength="60" placeholder="e.g. ATM withdrawal, salary" />
      </label>
      <p class="muted help">Moving money between your own accounts isn't spending, so it never counts against your budget.</p>

      <button type="submit" class="primary-btn" :disabled="!canSave">
        <AppIcon name="check" :stroke-width="2.4" /> Save
      </button>
      <button v-if="editing" type="button" class="danger-btn" @click="remove">
        <AppIcon name="trash" /> Delete transfer
      </button>
    </form>
  </main>
</template>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; min-height: 48px; }
.title { font-size: 17px; font-weight: 800; }
.spacer { width: 44px; }
.fields { display: flex; flex-direction: column; gap: 16px; }
.help { font-size: 13px; font-weight: 500; margin-top: -8px; line-height: 1.45; }
.warn { font-size: 13px; font-weight: 600; color: var(--warn-ink); margin-top: -8px; }
.empty { font-size: 14px; font-weight: 500; line-height: 1.5; color: var(--muted); }
.link { color: var(--accent); font-weight: 700; }
</style>
