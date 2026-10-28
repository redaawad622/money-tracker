<script setup lang="ts">
import { computed } from 'vue'
import { FAMILY_COLORS, categoryById } from '../data/categories'
import { formatMoney } from '../lib/money'
import type { Expense } from '../stores/expenses'
import AppIcon from './AppIcon.vue'

const { expense, currency } = defineProps<{ expense: Expense; currency: string }>()

const category = computed(() => categoryById(expense.categoryId))
const iconStyle = computed(() => {
  const c = FAMILY_COLORS[category.value.family]
  return { background: c.tint, color: c.ink }
})
const title = computed(() => expense.note.trim() || category.value.name)
const subtitle = computed(() => {
  const kind = expense.fromRewards ? 'From rewards' : category.value.group === 'monthly' ? 'Monthly bill' : 'Daily'
  const parts = [expense.note.trim() ? `${category.value.name} · ${kind.toLowerCase()}` : kind]
  if (expense.store) parts.push(expense.store)
  return parts.join(' · ')
})
</script>

<template>
  <RouterLink :to="`/expense/${expense.id}`" class="row">
    <span class="icon" :style="iconStyle"><AppIcon :name="category.icon" /></span>
    <span class="text">
      <span class="title">{{ title }}</span>
      <span class="sub">{{ subtitle }}<AppIcon v-if="expense.receipt" name="camera" :size="13" class="sub-icon" /></span>
    </span>
    <span class="amount">{{ formatMoney(expense.amount, currency) }}</span>
  </RouterLink>
</template>

<style scoped>
.row { display: flex; align-items: center; gap: 12px; padding: 12px 0; min-height: 44px; }
.row + .row { border-top: 1px solid var(--line-soft); }
.icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.text { flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.title { font-size: 15px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sub { font-size: 12px; font-weight: 500; color: var(--muted); display: flex; align-items: center; gap: 4px; overflow: hidden; white-space: nowrap; }
.sub-icon { flex: 0 0 auto; }
.amount { font-size: 15px; font-weight: 700; }
</style>
