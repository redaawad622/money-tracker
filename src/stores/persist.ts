import { watch, type WatchSource } from 'vue'
import { loadJson, saveJson } from '../lib/storage'

/**
 * Load saved data first, then start saving on change.
 * Arming the watcher only after the load stops empty initial state from overwriting stored data.
 */
export async function hydrateAndPersist<T>(key: string, source: WatchSource<T>, apply: (saved: T) => void, fallback: T) {
  apply(await loadJson<T>(key, fallback))
  watch(source, (value) => void saveJson(key, value), { deep: true })
}
