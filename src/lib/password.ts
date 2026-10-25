// Password hashing with PBKDF2 (Web Crypto), so the password itself is never stored.

export interface PasswordHash {
  salt: string // base64
  hash: string // base64
  iterations: number
}

const ITERATIONS = 210_000

const toB64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)))
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
}

export async function hashPassword(password: string): Promise<PasswordHash> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { salt: toB64(salt), hash: toB64(await derive(password, salt, ITERATIONS)), iterations: ITERATIONS }
}

export async function checkPassword(password: string, stored: PasswordHash): Promise<boolean> {
  const got = toB64(await derive(password, fromB64(stored.salt), stored.iterations))
  // Same length always (base64 of 32 bytes); compare every character so timing says nothing.
  let diff = got.length ^ stored.hash.length
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ stored.hash.charCodeAt(i)
  return diff === 0
}
