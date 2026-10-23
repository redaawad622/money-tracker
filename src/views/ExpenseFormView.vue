<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AmountKeypad from '../components/AmountKeypad.vue'
import AppIcon from '../components/AppIcon.vue'
import CategoryPicker from '../components/CategoryPicker.vue'
import { categoryById } from '../data/categories'
import { todayYmd } from '../lib/dates'
import { useExpensesStore } from '../stores/expenses'
import { useSettingsStore } from '../stores/settings'

const route = useRoute()
const router = useRouter()
const expenses = useExpensesStore()
const { settings } = useSettingsStore()

const editing = typeof route.params.id === 'string' ? expenses.get(route.params.id) : undefined
const queryDate = typeof route.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.date) ? route.query.date : null

const amountText = shallowRef(editing ? String(editing.amount) : '0')
const categoryId = shallowRef(editing?.categoryId ?? 'lunch')
const note = shallowRef(editing?.note ?? '')
const date = shallowRef(editing?.date ?? queryDate ?? todayYmd())

const amount = computed(() => Number.parseFloat(amountText.value) || 0)
const canSave = computed(() => amount.value > 0 && date.value !== '')
const category = computed(() => categoryById(categoryId.value))
const heading = editing ? 'Edit expense' : 'Add expense'

function save() {
  if (!canSave.value) return
  const input = { amount: Math.round(amount.value * 100) / 100, categoryId: categoryId.value, note: note.value.trim(), date: date.value }
  if (editing) expenses.update(editing.id, input)
  else expenses.add(input)
  void router.replace(`/day/${date.value}`)
}

function remove() {
  if (!editing) return
  if (!window.confirm('Delete this expense?')) return
  expenses.remove(editing.id)
  void router.replace(`/day/${editing.date}`)
}

function close() {
  if (window.history.length > 1) router.back()
  else void router.replace('/')
}
</script>

<template>
  <main class="page page--no-tabs form">
    <header class="header">
      <button type="button" class="icon-btn" aria-label="Close" @click="close"><AppIcon name="close" /></button>
      <h1 class="title">{{ heading }}</h1>
      <button v-if="editing" type="button" class="icon-btn" aria-label="Delete expense" @click="remove"><AppIcon name="trash" /></button>
      <div v-else class="spacer" />
    </header>

    <section class="amount" aria-live="polite">
      <span class="muted amount-label">{{ category.name }}<template v-if="category.group === 'monthly'"> · monthly bill</template></span>
      <div class="amount-value">
        <span class="currency">{{ settings.currency }}</span>
        <span class="digits">{{ amountText }}</span>
      </div>
    </section>

    <CategoryPicker v-model="categoryId" />

    <div class="meta">
      <label class="note">
        <span class="visually-hidden">Note</span>
        <AppIcon name="pencil" :size="18" />
        <input v-model="note" type="text" placeholder="Add a note" maxlength="80" />
      </label>
      <label class="date">
        <span class="visually-hidden">Date</span>
        <input v-model="date" type="date" :max="todayYmd()" />
      </label>
    </div>

    <AmountKeypad v-model="amountText" />

    <button type="button" class="primary-btn" :disabled="!canSave" @click="save">
      <AppIcon name="check" :stroke-width="2.4" /> Save expense
    </button>
  </main>
</template>

<style scoped>
.form { gap: 12px; }
.header { display: flex; align-items: center; justify-content: space-between; min-height: 48px; }
.title { font-size: 17px; font-weight: 800; }
.spacer { width: 44px; }
.amount { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.amount-label { font-size: 13px; font-weight: 600; }
.amount-value { display: flex; align-items: baseline; gap: 6px; }
.currency { font-size: 24px; font-weight: 700; color: var(--muted); }
.digits { font-size: 48px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; }
.meta { display: flex; gap: 8px; }
.note, .date {
  height: 46px; display: flex; align-items: center; gap: 8px;
  background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 0 12px;
}
.note { flex: 1 1 auto; color: var(--muted); min-width: 0; }
.note input, .date input { border: 0; outline: none; background: transparent; font-size: 14px; font-weight: 600; min-width: 0; }
.note input { flex: 1 1 auto; color: var(--ink); }
.date { flex: 0 0 auto; }
</style>
