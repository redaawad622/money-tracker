import { afterEach, describe, expect, it } from 'vitest'
import { ACCOUNT_KINDS } from '../lib/accounts'
import { AR } from './ar'
import { lang, t } from './index'

// The app's own source text, read at test time.
const SOURCES = import.meta.glob<string>(['../**/*.vue', '../**/*.ts', '!../**/*.test.ts'], { query: '?raw', import: 'default', eager: true })

/** Every literal key passed to t(), e.g. t('Save') or t("Don't"). */
function usedKeys(): Set<string> {
  const keys = new Set<string>()
  for (const text of Object.values(SOURCES)) {
    for (const m of text.matchAll(/\bt\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)) keys.add((m[1] ?? m[2]).replace(/\\(.)/g, '$1'))
  }
  return keys
}

describe('translations', () => {
  afterEach(() => { lang.value = 'en' })

  it('has Arabic for every text the app shows', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(50)
    const keys = usedKeys()
    expect(keys.size).toBeGreaterThan(300)
    const missing = [...keys].filter((k) => !(k in AR))
    expect(missing).toEqual([])
  })

  it('has Arabic for texts picked at run time', () => {
    const dynamic = [
      ...ACCOUNT_KINDS.map((k) => k.label),
      ...['fixed income', 'investment', 'deal', 'project'].flatMap((x) => [`New ${x}`, `Edit ${x}`, `Delete ${x}`]),
      'Face ID', 'Touch ID', 'Passcode',
    ]
    expect(dynamic.filter((k) => !(k in AR))).toEqual([])
  })

  it('keeps the same placeholders in Arabic', () => {
    const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    const wrong = Object.entries(AR).filter(([en, ar]) => names(en).join() !== names(ar).join()).map(([en]) => en)
    expect(wrong).toEqual([])
  })

  it('fills placeholders and falls back to English', () => {
    expect(t('{n} days', { n: 3 })).toBe('3 days')
    lang.value = 'ar'
    expect(t('{n} days', { n: 3 })).toBe('3 يوم')
    expect(t('Not translated anywhere')).toBe('Not translated anywhere')
  })
})
