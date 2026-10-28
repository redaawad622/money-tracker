import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Goal, GoalEntry } from '../lib/goals'
import { saved } from '../lib/goals'
import { newId } from '../lib/id'
import { sumMoney } from '../lib/money'
import { hydrateAndPersist } from './persist'

export type GoalInput = Pick<Goal, 'name' | 'target' | 'targetDate'>

/** Savings goals and the money put aside for each. */
export const useGoalsStore = defineStore('goals', () => {
  const goals = ref<Goal[]>([])

  const totalSaved = computed(() => sumMoney(goals.value.map(saved)))

  function get(id: string) {
    return goals.value.find((g) => g.id === id)
  }

  function add(input: GoalInput): Goal {
    const goal: Goal = { ...input, id: newId(), entries: [] }
    goals.value.push(goal)
    return goal
  }

  function update(id: string, input: GoalInput) {
    const g = get(id)
    if (!g) return
    Object.assign(g, input)
    if (!input.targetDate) delete g.targetDate
  }

  function remove(id: string) {
    goals.value = goals.value.filter((g) => g.id !== id)
  }

  function addEntry(goalId: string, entry: Omit<GoalEntry, 'id'>) {
    get(goalId)?.entries.push({ ...entry, id: newId() })
  }

  function removeEntry(goalId: string, entryId: string) {
    const g = get(goalId)
    if (g) g.entries = g.entries.filter((e) => e.id !== entryId)
  }

  function hydrate() {
    return hydrateAndPersist<Goal[]>('goals', goals, (saved) => { goals.value = saved }, [])
  }

  return { goals, totalSaved, get, add, update, remove, addEntry, removeEntry, hydrate }
})
