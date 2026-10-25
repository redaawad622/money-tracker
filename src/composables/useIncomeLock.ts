import { readonly, ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { loadJson, saveJson } from '../lib/storage'
import { checkPassword, hashPassword, type PasswordHash } from '../lib/password'

// An optional password on the Income section. It asks each time Income is opened from another
// screen and after the app goes to the background; moving between Income's own pages doesn't ask
// again. Kept on this device and not synced, like the Face ID switch.

const KEY = 'incomePassword'

const stored = ref<PasswordHash | null>(null)
const unlocked = ref(false)

let started = false

async function start() {
  if (started) return
  started = true
  stored.value = await loadJson<PasswordHash | null>(KEY, null)
  const lock = () => { unlocked.value = false }
  if (Capacitor.isNativePlatform()) {
    const { App } = await import('@capacitor/app')
    App.addListener('pause', lock)
  } else {
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && lock())
  }
}

async function unlock(password: string): Promise<boolean> {
  if (!stored.value) return true
  const ok = await checkPassword(password, stored.value)
  if (ok) unlocked.value = true
  return ok
}

function lock() {
  unlocked.value = false
}

async function setPassword(password: string) {
  stored.value = await hashPassword(password)
  unlocked.value = false
  await saveJson(KEY, stored.value)
}

async function removePassword() {
  stored.value = null
  await saveJson(KEY, null)
}

export function useIncomeLock() {
  return {
    hasPassword: () => stored.value !== null,
    stored: readonly(stored),
    unlocked: readonly(unlocked),
    start,
    unlock,
    lock,
    setPassword,
    removePassword,
  }
}
