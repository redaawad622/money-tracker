import { defineStore } from 'pinia'
import { computed } from 'vue'
import { CATEGORIES, allCategories, categoryEdits, type Category, type CategoryEdit, type CategoryGroup } from '../data/categories'
import { t } from '../i18n'
import { newId } from '../lib/id'
import { hydrateAndPersist } from './persist'

type Fields = Pick<Category, 'name' | 'family' | 'icon'> & { hidden: boolean }

/** The user's renamed, hidden and added categories, saved on the device and synced. */
export const useCategoriesStore = defineStore('categories', () => {
  const edits = categoryEdits
  const categories = computed(() => allCategories())

  function inGroup(group: CategoryGroup, withHidden = false) {
    return categories.value.filter((c) => c.group === group && (withHidden || !c.hidden))
  }

  function add(group: CategoryGroup, fields: Fields): string {
    const id = `custom-${newId()}`
    edits.value = [...edits.value, { id, group, ...fields }]
    return id
  }

  /** Saves only what differs from the built-in category, so later changes to the defaults still show. */
  function update(id: string, fields: Fields) {
    const base = CATEGORIES.find((c) => c.id === id)
    let edit: CategoryEdit
    if (base) {
      edit = { id }
      // Saving the shown (maybe translated) built-in name isn't a rename.
      if (fields.name !== base.name && fields.name !== t(base.name)) edit.name = fields.name
      if (fields.family !== base.family) edit.family = fields.family
      if (fields.icon !== base.icon) edit.icon = fields.icon
      if (fields.hidden) edit.hidden = true
    } else {
      const current = edits.value.find((e) => e.id === id)
      if (!current) return
      edit = { ...current, ...fields }
    }
    const keep = Object.keys(edit).length > 1
    if (!edits.value.some((e) => e.id === id)) edits.value = keep ? [...edits.value, edit] : edits.value
    else edits.value = keep ? edits.value.map((e) => (e.id === id ? edit : e)) : edits.value.filter((e) => e.id !== id)
  }

  /** Removes one the user added, or puts a built-in one back as it was. */
  function remove(id: string) {
    edits.value = edits.value.filter((e) => e.id !== id)
  }

  function hydrate() {
    return hydrateAndPersist<CategoryEdit[]>('categories', edits, (saved) => { edits.value = saved }, [])
  }

  return { edits, categories, inGroup, add, update, remove, hydrate }
})
