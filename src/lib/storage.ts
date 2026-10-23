import { Preferences } from '@capacitor/preferences'

// Capacitor Preferences: native key-value storage on iOS/Android, localStorage on the web.

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const { value } = await Preferences.get({ key })
    return value == null ? fallback : (JSON.parse(value) as T)
  } catch {
    return fallback
  }
}

export async function saveJson(key: string, value: unknown): Promise<void> {
  await Preferences.set({ key, value: JSON.stringify(value) })
}
