import { Capacitor } from '@capacitor/core'
import { newId } from './id'

// Receipt photos stay on the device that took them: in the app's data folder on the phone, in
// IndexedDB in the browser. An expense keeps only the file name, so syncing never uploads photos;
// another device shows that the photo is on the phone it was taken on.

const DIR = 'receipts'
const MAX_SIDE = 1600
const QUALITY = 0.72

/** Shrinks a picked photo to a JPEG no wider or taller than MAX_SIDE, as base64 without the data: prefix. */
async function shrink(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', QUALITY).split(',')[1]
}

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('money-tracker-receipts', 1)
    req.onupgradeneeded = () => req.result.createObjectStore(DIR)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idb<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const d = await db()
  return new Promise((resolve, reject) => {
    const req = run(d.transaction(DIR, mode).objectStore(DIR))
    req.onsuccess = () => resolve(req.result as T)
    req.onerror = () => reject(req.error)
  })
}

/** Saves a picked photo and returns its file name. */
export async function saveReceipt(file: Blob): Promise<string> {
  const data = await shrink(file)
  const name = `${newId()}.jpg`
  if (Capacitor.isNativePlatform()) {
    const { Directory, Filesystem } = await import('@capacitor/filesystem')
    await Filesystem.writeFile({ path: `${DIR}/${name}`, data, directory: Directory.Data, recursive: true })
  } else {
    await idb('readwrite', (s) => s.put(data, name))
  }
  return name
}

/** The photo as a data: URL, or null when it isn't on this device. */
export async function loadReceipt(name: string): Promise<string | null> {
  try {
    let data: string | undefined
    if (Capacitor.isNativePlatform()) {
      const { Directory, Filesystem } = await import('@capacitor/filesystem')
      data = (await Filesystem.readFile({ path: `${DIR}/${name}`, directory: Directory.Data })).data as string
    } else {
      data = await idb<string | undefined>('readonly', (s) => s.get(name))
    }
    return data ? `data:image/jpeg;base64,${data}` : null
  } catch {
    return null
  }
}

export async function deleteReceipt(name: string): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Directory, Filesystem } = await import('@capacitor/filesystem')
      await Filesystem.deleteFile({ path: `${DIR}/${name}`, directory: Directory.Data })
    } else {
      await idb('readwrite', (s) => s.delete(name))
    }
  } catch {
    // Already gone.
  }
}
