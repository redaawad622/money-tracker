import { ref } from 'vue'
import { AR } from './ar'

// The app's text is written in English in the code; t() looks each sentence up in the Arabic
// dictionary when Arabic is on, and falls back to the English if a sentence has no translation.
// {name} placeholders are filled from params.

export type Lang = 'en' | 'ar'

export const LANGUAGES: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'ar', label: 'العربية' },
]

export const lang = ref<Lang>('en')

export function t(text: string, params?: Record<string, string | number>): string {
  const out = (lang.value === 'ar' && AR[text]) || text
  return params ? out.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : out
}

/** Locale for dates: Arabic month and day names with Western digits, like the amounts. */
export function locale(): string {
  return lang.value === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB'
}

export function setLang(next: Lang) {
  lang.value = next
  document.documentElement.lang = next
  document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'
}
