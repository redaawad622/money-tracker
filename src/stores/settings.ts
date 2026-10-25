import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { hydrateAndPersist } from './persist'

export interface Settings {
  currency: string
  monthlyBudget: number
  includeSubscriptionsInBudget: boolean
  /** Spread each day's overspending or leftover across the daily budgets of the days left in the month. */
  spreadDailyDifference: boolean
  /** Paid into the reward pot for each 1000-round finished in Azkar Tracker; 0 turns it off. */
  azkarReward: number
  /** Paid into the reward pot for each 30 days with a logged workout in Workout Tracker; 0 turns it off. */
  workoutReward: number
}

const DEFAULTS: Settings = { currency: '$', monthlyBudget: 2000, includeSubscriptionsInBudget: true, spreadDailyDifference: false, azkarReward: 0, workoutReward: 0 }

export const useSettingsStore = defineStore('settings', () => {
  const settings = reactive<Settings>({ ...DEFAULTS })

  function hydrate() {
    return hydrateAndPersist<Settings>('settings', () => ({ ...settings }), (saved) => Object.assign(settings, DEFAULTS, saved), DEFAULTS)
  }

  return { settings, hydrate }
})
