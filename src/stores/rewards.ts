import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { monthKeyOf } from '../lib/dates'
import { sumMoney } from '../lib/money'
import type { Reward } from '../lib/rewards'
import { useExpensesStore } from './expenses'
import { hydrateAndPersist } from './persist'

/** The reward pot: what Azkar and Workout earned, less the expenses paid from it. */
export const useRewardsStore = defineStore('rewards', () => {
  const rewards = ref<Reward[]>([])
  const expenses = useExpensesStore()

  const earned = computed(() => sumMoney(rewards.value.map((r) => r.amount)))
  const spent = computed(() => sumMoney(expenses.expenses.filter((e) => e.fromRewards).map((e) => e.amount)))
  const balance = computed(() => sumMoney([earned.value, -spent.value]))

  function earnedInMonth(monthKey: string): number {
    return sumMoney(rewards.value.filter((r) => monthKeyOf(r.date) === monthKey).map((r) => r.amount))
  }

  function hydrate() {
    return hydrateAndPersist<Reward[]>('rewards', rewards, (saved) => { rewards.value = saved }, [])
  }

  return { rewards, earned, spent, balance, earnedInMonth, hydrate }
})
