import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { hydrateAndPersist } from './persist'

export interface Settings {
  currency: string
  monthlyBudget: number
  includeSubscriptionsInBudget: boolean
  /** Take a day's overspending off the daily budget of the days left in the month. */
  spreadOverspending: boolean
}

const DEFAULTS: Settings = { currency: '$', monthlyBudget: 2000, includeSubscriptionsInBudget: true, spreadOverspending: false }

export const useSettingsStore = defineStore('settings', () => {
  const settings = reactive<Settings>({ ...DEFAULTS })

  function hydrate() {
    return hydrateAndPersist<Settings>('settings', () => ({ ...settings }), (saved) => Object.assign(settings, DEFAULTS, saved), DEFAULTS)
  }

  return { settings, hydrate }
})
