import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { monthKeyOf } from '../lib/dates'
import { newId } from '../lib/id'
import { sumMoney } from '../lib/money'
import { hydrateAndPersist } from './persist'

export interface Expense {
  id: string
  amount: number
  categoryId: string
  note: string
  /** Local date, YYYY-MM-DD */
  date: string
  createdAt: number
}

export type ExpenseInput = Omit<Expense, 'id' | 'createdAt'>

export const useExpensesStore = defineStore('expenses', () => {
  const expenses = ref<Expense[]>([])

  const byDate = computed(() => {
    const map = new Map<string, Expense[]>()
    for (const e of expenses.value) {
      const list = map.get(e.date)
      if (list) list.push(e)
      else map.set(e.date, [e])
    }
    for (const list of map.values()) list.sort((a, b) => a.createdAt - b.createdAt)
    return map
  })

  const dailyTotals = computed(() => {
    const totals = new Map<string, number>()
    for (const [date, list] of byDate.value) totals.set(date, sumMoney(list.map((e) => e.amount)))
    return totals
  })

  function forDate(date: string): Expense[] {
    return byDate.value.get(date) ?? []
  }

  function totalForDate(date: string): number {
    return dailyTotals.value.get(date) ?? 0
  }

  function totalForMonth(monthKey: string): number {
    const values: number[] = []
    for (const [date, total] of dailyTotals.value) if (monthKeyOf(date) === monthKey) values.push(total)
    return sumMoney(values)
  }

  function get(id: string): Expense | undefined {
    return expenses.value.find((e) => e.id === id)
  }

  function add(input: ExpenseInput): Expense {
    const expense: Expense = { ...input, id: newId(), createdAt: Date.now() }
    expenses.value.push(expense)
    return expense
  }

  function update(id: string, input: ExpenseInput) {
    const e = get(id)
    if (e) Object.assign(e, input)
  }

  function remove(id: string) {
    expenses.value = expenses.value.filter((e) => e.id !== id)
  }

  function hydrate() {
    return hydrateAndPersist<Expense[]>('expenses', expenses, (saved) => { expenses.value = saved }, [])
  }

  return { expenses, forDate, totalForDate, totalForMonth, get, add, update, remove, hydrate }
})
