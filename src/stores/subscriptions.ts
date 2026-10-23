import { defineStore } from 'pinia'
import { ref } from 'vue'
import { newId } from '../lib/id'
import { sumMoney } from '../lib/money'
import { dueDatesInMonth, type Subscription } from '../lib/subscriptions'
import { hydrateAndPersist } from './persist'

export type SubscriptionInput = Omit<Subscription, 'id' | 'paid'>

export const useSubscriptionsStore = defineStore('subscriptions', () => {
  const subscriptions = ref<Subscription[]>([])

  function get(id: string) {
    return subscriptions.value.find((s) => s.id === id)
  }

  function add(input: SubscriptionInput) {
    subscriptions.value.push({ ...input, id: newId(), paid: [] })
  }

  function update(id: string, input: SubscriptionInput) {
    const s = get(id)
    if (s) Object.assign(s, input)
  }

  function remove(id: string) {
    subscriptions.value = subscriptions.value.filter((s) => s.id !== id)
  }

  function setPaid(id: string, dueDate: string, paid: boolean) {
    const s = get(id)
    if (!s) return
    const others = s.paid.filter((d) => d !== dueDate)
    s.paid = paid ? [...others, dueDate] : others
  }

  /** Everything due in a month, across all subscriptions. */
  function dueInMonth(monthKey: string) {
    return subscriptions.value.flatMap((s) => dueDatesInMonth(s, monthKey).map((date) => ({ sub: s, date })))
  }

  function totalDueInMonth(monthKey: string): number {
    return sumMoney(dueInMonth(monthKey).map((d) => d.sub.amount))
  }

  function hydrate() {
    return hydrateAndPersist<Subscription[]>('subscriptions', subscriptions, (saved) => { subscriptions.value = saved }, [])
  }

  return { subscriptions, get, add, update, remove, setPaid, dueInMonth, totalDueInMonth, hydrate }
})
