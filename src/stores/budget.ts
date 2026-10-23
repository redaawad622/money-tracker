import { defineStore } from 'pinia'
import { daysInMonth, splitMonthKey } from '../lib/dates'
import { useExpensesStore } from './expenses'
import { useSettingsStore } from './settings'
import { useSubscriptionsStore } from './subscriptions'

/** Combines expenses, subscriptions and settings into the month's budget picture. */
export const useBudgetStore = defineStore('budget', () => {
  const expenses = useExpensesStore()
  const subs = useSubscriptionsStore()
  const { settings } = useSettingsStore()

  function monthSummary(monthKey: string) {
    const { year, month } = splitMonthKey(monthKey)
    const days = daysInMonth(year, month)
    const daily = expenses.totalForMonth(monthKey)
    const fixed = subs.totalDueInMonth(monthKey)
    const counted = settings.includeSubscriptionsInBudget ? fixed : 0
    const budget = settings.monthlyBudget
    const spent = daily + counted
    return {
      days,
      daily,
      fixed,
      spent,
      budget,
      left: budget - spent,
      /** Budget available for day-to-day spending, per day. */
      dailyBudget: Math.max(budget - counted, 0) / days,
    }
  }

  return { monthSummary }
})
