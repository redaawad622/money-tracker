import { newId } from './id'

// Two-way sync between this device's saved data and the signed-in user's rows in Supabase
// (table "money_records"). Local data stays the source of truth: a sync only ever deletes a
// local record when another device deleted it on purpose, and a record missing from the cloud
// is uploaded again, never removed here.

export const KINDS = ['expenses', 'subscriptions', 'settings', 'income', 'rewards'] as const
export type Kind = (typeof KINDS)[number]

export interface Remote {
  kind: Kind
  uid: string
  data: unknown
  deleted: boolean
}

export interface Local {
  kind: Kind
  uid: string
  data: unknown // the record without its id; for settings, the whole settings object
}

export type Op =
  | { op: 'put'; kind: Kind; uid: string; data: unknown }
  | { op: 'delete'; kind: Kind; uid: string }
  | { op: 'rekey'; kind: Kind; uid: string; to: string }

export interface Plan {
  ops: Op[] // changes to make on this device
  push: Remote[] // changes to upload
  synced: Record<string, string | null> // agreed hash per "<kind>:<uid>" after the sync (null: absent)
}

// Same JSON for the same content, whatever the key order.
export function stable(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null'
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`
  const o = v as Record<string, unknown>
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stable(o[k])}`)
    .join(',')}}`
}

// cyrb53: a small, fast 53-bit string hash.
export function hash(v: unknown): string {
  const s = stable(v)
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

// Both sides changed the same subscription, income source or the settings: one merged version.
// This device wins on plain fields; paid due dates and project entries from either side are kept.
function merge(kind: Kind, local: any, remote: any) {
  if (kind === 'subscriptions') {
    const paid = [...new Set([...(remote?.paid ?? []), ...(local?.paid ?? [])])].sort()
    return { ...remote, ...local, paid }
  }
  if (kind === 'income' && Array.isArray(local?.entries)) {
    const byId = new Map<string, unknown>()
    for (const e of [...(remote?.entries ?? []), ...local.entries]) byId.set(e.id, e)
    return { ...remote, ...local, entries: [...byId.values()] }
  }
  return local
}

export function plan(local: Local[], remote: Remote[], synced: Record<string, string>): Plan {
  const out: Plan = { ops: [], push: [], synced: {} }
  const L = new Map(local.map((r) => [`${r.kind}:${r.uid}`, r]))
  const R = new Map(remote.map((r) => [`${r.kind}:${r.uid}`, r]))
  const keys = new Set([...L.keys(), ...R.keys()])

  for (const key of keys) {
    const l = L.get(key)
    const r = R.get(key)
    const kind = (l ?? r)!.kind
    const uid = (l ?? r)!.uid
    const lHash = l ? hash(l.data) : null
    const rLive = r && !r.deleted ? r : undefined
    const rHash = rLive ? hash(rLive.data) : null
    const base = synced[key] ?? null

    if (lHash === rHash) {
      out.synced[key] = lHash
      continue
    }
    const localChanged = lHash !== base
    // A row missing from the cloud (not marked deleted) is never a reason to delete here.
    const remoteChanged = r ? rHash !== base : false

    const pushLocal = () => {
      out.push.push(l ? { kind, uid, data: l.data, deleted: false } : { kind, uid, data: null, deleted: true })
      out.synced[key] = lHash
    }
    const takeRemote = () => {
      if (rLive) out.ops.push({ op: 'put', kind, uid, data: rLive.data })
      else out.ops.push({ op: 'delete', kind, uid })
      out.synced[key] = rHash
    }

    if (localChanged && !remoteChanged) pushLocal()
    else if (remoteChanged && !localChanged) takeRemote()
    else if (!l) takeRemote() // deleted here, changed elsewhere: keep the change
    else if (!rLive) pushLocal() // changed here, deleted elsewhere: keep it
    else if (kind === 'expenses') {
      // Both sides edited the same expense: keep both rather than lose either.
      const fresh = newId()
      out.ops.push({ op: 'rekey', kind, uid, to: fresh })
      out.push.push({ kind, uid: fresh, data: l.data, deleted: false })
      out.synced[`${kind}:${fresh}`] = lHash
      out.ops.push({ op: 'put', kind, uid, data: rLive.data })
      out.synced[key] = rHash
    } else {
      const merged = merge(kind, l.data, rLive.data)
      const h = hash(merged)
      if (h !== lHash) out.ops.push({ op: 'put', kind, uid, data: merged })
      if (h !== rHash) out.push.push({ kind, uid, data: merged, deleted: false })
      out.synced[key] = h
    }
  }
  return out
}

// Apply this kind's ops to a list of records with ids. Returns null when nothing changed.
export function applyOps<T extends { id: string }>(list: T[], kind: Kind, ops: Op[]): T[] | null {
  const mine = ops.filter((o) => o.kind === kind)
  if (!mine.length) return null
  const next = [...list]
  for (const o of mine) {
    const i = next.findIndex((x) => x.id === o.uid)
    if (o.op === 'rekey') {
      if (i >= 0) next[i] = { ...next[i], id: o.to }
    } else if (o.op === 'delete') {
      if (i >= 0) next.splice(i, 1)
    } else {
      const row = { ...(o.data as object), id: o.uid } as T
      if (i >= 0) next[i] = row
      else next.push(row)
    }
  }
  return next
}
