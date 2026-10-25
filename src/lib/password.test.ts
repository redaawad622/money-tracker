import { describe, expect, it } from 'vitest'
import { checkPassword, hashPassword } from './password'

describe('password', () => {
  it('accepts the right password only, and never stores it', async () => {
    const h = await hashPassword('1234')
    expect(JSON.stringify(h)).not.toContain('1234')
    expect(await checkPassword('1234', h)).toBe(true)
    expect(await checkPassword('12345', h)).toBe(false)
    expect((await hashPassword('1234')).hash).not.toBe(h.hash) // salted
  })
})
