import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { newId } from '../lib/id'
import type { Deal, IncomeSource, Investment, Project, ProjectEntry, Salary } from '../lib/income'
import { hydrateAndPersist } from './persist'

type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never
export type IncomeInput = WithoutId<IncomeSource>

export const useIncomeStore = defineStore('income', () => {
  const sources = ref<IncomeSource[]>([])

  const salaries = computed(() => sources.value.filter((s): s is Salary => s.type === 'salary'))
  const investments = computed(() => sources.value.filter((s): s is Investment => s.type === 'investment'))
  const deals = computed(() => sources.value.filter((s): s is Deal => s.type === 'deal'))
  const projects = computed(() => sources.value.filter((s): s is Project => s.type === 'project'))

  function get(id: string) {
    return sources.value.find((s) => s.id === id)
  }

  function add(input: IncomeInput) {
    const source = { ...input, id: newId() } as IncomeSource
    sources.value.push(source)
    return source
  }

  function update(id: string, input: IncomeInput) {
    const s = get(id)
    if (s) Object.assign(s, input)
  }

  function remove(id: string) {
    sources.value = sources.value.filter((s) => s.id !== id)
  }

  function addEntry(projectId: string, entry: Omit<ProjectEntry, 'id'>) {
    const p = get(projectId)
    if (p?.type === 'project') p.entries.push({ ...entry, id: newId() })
  }

  function removeEntry(projectId: string, entryId: string) {
    const p = get(projectId)
    if (p?.type === 'project') p.entries = p.entries.filter((e) => e.id !== entryId)
  }

  function hydrate() {
    return hydrateAndPersist<IncomeSource[]>('income', sources, (saved) => { sources.value = saved }, [])
  }

  return { sources, salaries, investments, deals, projects, get, add, update, remove, addEntry, removeEntry, hydrate }
})
