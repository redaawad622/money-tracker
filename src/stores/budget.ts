import { defineStore } from 'pinia'
import { daysInMonth, monthDates, monthKeyOf, splitMonthKey } from '../lib/dates'
import { spreadDailyLimits } from '../lib/spread'
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

  /** Each day's limit in the month, lowered by earlier overspending when that setting is on. */
  function dailyLimits(monthKey: string): number[] {
    const { dailyBudget } = monthSummary(monthKey)
    const dates = monthDates(monthKey)
    if (!settings.spreadOverspending) return dates.map(() => dailyBudget)
    return spreadDailyLimits(dailyBudget, dates.map((d) => expenses.totalForDate(d)))
  }

  function limitForDate(date: string): number {
    return dailyLimits(monthKeyOf(date))[Number(date.slice(8, 10)) - 1]
  }

  return { monthSummary, dailyLimits, limitForDate }
})
