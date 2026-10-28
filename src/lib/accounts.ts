import { sumMoney } from './money'
import { toYmd } from './dates'

// Accounts are where money sits: cash, a bank account, a card or a wallet like InstaPay. Each one
// starts from a balance the user sets at a moment (startAt); after that, expenses paid with it
// take money out and transfers move money between accounts. Moving money between two of your
// own accounts is not spending, so transfers never touch the budget.

export type AccountKind = 'cash' | 'bank' | 'card' | 'wallet'

export interface Account {
  id: string
  name: string
  kind: AccountKind
  /** Balance at startAt, as the user last set it. */
  startBalance: number
  /** When startBalance was set (ms). Only what comes after it changes the balance. */
  startAt: number
  hidden?: boolean
}

export interface Transfer {
  id: string
  /** null: money coming in from outside, like a salary or a gift. */
  from: string | null
  to: string
  amount: number
  /** Local date, YYYY-MM-DD */
  date: string
  note: string
  createdAt: number
}

export interface Paid {
  id: string
  amount: number
  date: string
  createdAt: number
  accountId?: string
}

export const ACCOUNT_KINDS: { id: AccountKind; label: string; icon: 'coins' | 'store' | 'card' | 'wallet' }[] = [
  { id: 'cash', label: 'Cash', icon: 'coins' },
  { id: 'bank', label: 'Bank account', icon: 'store' },
  { id: 'card', label: 'Card', icon: 'card' },
  { id: 'wallet', label: 'Wallet', icon: 'wallet' },
]

/** Whether something dated `date` and recorded at `createdAt` happened after the balance was set. */
export function afterStart(account: Account, date: string, createdAt: number): boolean {
  const startDay = toYmd(new Date(account.startAt))
  return date > startDay || (date === startDay && createdAt > account.startAt)
}

export interface Movement {
  id: string
  kind: 'expense' | 'in' | 'out'
  date: string
  createdAt: number
  /** Signed: money in is positive. */
  amount: number
  transfer?: Transfer
}

/** What changed this account's balance since it was set, newest first. */
export function movements(account: Account, transfers: Transfer[], paid: Paid[]): Movement[] {
  const out: Movement[] = []
  for (const e of paid) {
    if (e.accountId === account.id && afterStart(account, e.date, e.createdAt)) {
      out.push({ id: e.id, kind: 'expense', date: e.date, createdAt: e.createdAt, amount: -e.amount })
    }
  }
  for (const t of transfers) {
    if (!afterStart(account, t.date, t.createdAt)) continue
    if (t.to === account.id) out.push({ id: t.id, kind: 'in', date: t.date, createdAt: t.createdAt, amount: t.amount, transfer: t })
    if (t.from === account.id) out.push({ id: t.id, kind: 'out', date: t.date, createdAt: t.createdAt, amount: -t.amount, transfer: t })
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
}

export function balance(account: Account, transfers: Transfer[], paid: Paid[]): number {
  return sumMoney([account.startBalance, ...movements(account, transfers, paid).map((m) => m.amount)])
}
