import { describe, expect, it } from 'vitest'
import { CATEGORIES, applyCategoryEdits } from './categories'

describe('applyCategoryEdits', () => {
  it('returns the built-in categories when nothing is edited', () => {
    expect(applyCategoryEdits([])).toEqual(CATEGORIES)
  })

  it('renames and hides built-in ones but keeps their id and group', () => {
    const out = applyCategoryEdits([{ id: 'wife', name: 'Mona', hidden: true, group: 'monthly' }])
    expect(out.find((c) => c.id === 'wife')).toMatchObject({ name: 'Mona', hidden: true, group: 'daily', icon: 'wife' })
    expect(out).toHaveLength(CATEGORIES.length)
  })

  it('adds the user\'s own after the built-in ones, skipping incomplete entries', () => {
    const out = applyCategoryEdits([
      { id: 'custom-1', name: 'Pets', group: 'daily', family: 'family', icon: 'other' },
      { id: 'custom-2', name: 'Half' },
    ])
    expect(out.slice(CATEGORIES.length)).toEqual([{ id: 'custom-1', name: 'Pets', group: 'daily', family: 'family', icon: 'other', custom: true }])
  })
})
