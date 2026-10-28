import { Capacitor } from '@capacitor/core'

/**
 * Hands a text file to the user. On the phone it is written to the app's cache and opened in the
 * share sheet (Save to Files, AirDrop, Mail…); in the browser it downloads.
 */
export async function saveTextFile(name: string, text: string, mime: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Directory, Encoding, Filesystem } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')
    const { uri } = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 })
    try {
      await Share.share({ title: name, files: [uri] })
    } catch (e: any) {
      // Closing the share sheet without picking anything isn't an error.
      if (!/cancel/i.test(e?.message ?? '')) throw e
    }
    return
  }
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
