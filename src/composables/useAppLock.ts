import { readonly, ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { loadJson, saveJson } from '../lib/storage'

// Face ID (or Touch ID) on opening the app and on coming back to it, on the phone only. The device
// passcode is offered when Face ID fails, so it can't lock anyone out. The switch is kept on this
// device and not synced: another phone or the web has its own.

const ENABLED = 'appLock'

const available = ref(false)
const kind = ref('Face ID')
const enabled = ref(false)
const locked = ref(false)
const busy = ref(false)

let started = false

const plugin = () => import('@capgo/capacitor-native-biometric')

async function unlock() {
  if (!locked.value || busy.value) return
  busy.value = true
  try {
    await (await plugin()).NativeBiometric.verifyIdentity({ reason: 'Unlock Money Tracker', title: 'Money Tracker', useFallback: true })
    locked.value = false
  } catch {
    // Cancelled or failed: stay locked; the lock screen offers to try again.
  } finally {
    busy.value = false
  }
}

/** Called before the app mounts, so nothing shows before the lock does. */
async function start() {
  if (started || !Capacitor.isNativePlatform()) return
  started = true
  const { NativeBiometric, BiometryType } = await plugin()
  try {
    const res = await NativeBiometric.isAvailable({ useFallback: true })
    available.value = res.isAvailable
    const t = res.biometryType
    kind.value = t === BiometryType.TOUCH_ID ? 'Touch ID' : t === BiometryType.NONE || t === BiometryType.DEVICE_CREDENTIAL ? 'Passcode' : 'Face ID'
  } catch {
    available.value = false
  }
  enabled.value = available.value && (await loadJson<boolean>(ENABLED, true))
  locked.value = enabled.value

  const { App } = await import('@capacitor/app')
  App.addListener('pause', () => {
    if (enabled.value) locked.value = true
  })
  App.addListener('resume', () => void unlock())
  if (locked.value) void unlock()
}

async function setEnabled(on: boolean) {
  enabled.value = on && available.value
  await saveJson(ENABLED, enabled.value)
}

export function useAppLock() {
  return {
    available: readonly(available),
    kind: readonly(kind),
    enabled: readonly(enabled),
    locked: readonly(locked),
    busy: readonly(busy),
    start,
    unlock,
    setEnabled,
  }
}
