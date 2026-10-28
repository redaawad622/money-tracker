import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { balance, movements, type Account, type Transfer } from '../lib/accounts'
import { newId } from '../lib/id'
import { sumMoney } from '../lib/money'
import { useExpensesStore } from './expenses'
import { hydrateAndPersist } from './persist'

export type AccountInput = Pick<Account, 'name' | 'kind' | 'hidden'>
export type TransferInput = Omit<Transfer, 'id' | 'createdAt'>

/** Cash, bank, card and wallet accounts, their balances, and transfers between them. */
export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref<Account[]>([])
  const transfers = ref<Transfer[]>([])
  const expenses = useExpensesStore()

  const visible = computed(() => accounts.value.filter((a) => !a.hidden))

  function get(id: string) {
    return accounts.value.find((a) => a.id === id)
  }

  function balanceOf(id: string): number {
    const a = get(id)
    return a ? balance(a, transfers.value, expenses.expenses) : 0
  }

  function movementsOf(id: string) {
    const a = get(id)
    return a ? movements(a, transfers.value, expenses.expenses) : []
  }

  const total = computed(() => sumMoney(visible.value.map((a) => balanceOf(a.id))))

  function add(input: AccountInput, startBalance: number): Account {
    const account: Account = { ...input, id: newId(), startBalance, startAt: Date.now() }
    accounts.value.push(account)
    return account
  }

  function update(id: string, input: AccountInput) {
    const a = get(id)
    if (a) Object.assign(a, input)
  }

  /** Sets what the account holds right now; only what happens from here on changes it. */
  function setBalance(id: string, amount: number) {
    const a = get(id)
    if (a) Object.assign(a, { startBalance: amount, startAt: Date.now() })
  }

  /** Deletes the account and its transfers; expenses paid with it keep their amount but lose the link. */
  function remove(id: string) {
    accounts.value = accounts.value.filter((a) => a.id !== id)
    transfers.value = transfers.value.filter((t) => t.from !== id && t.to !== id)
    for (const e of expenses.expenses) if (e.accountId === id) delete e.accountId
  }

  function getTransfer(id: string) {
    return transfers.value.find((t) => t.id === id)
  }

  function addTransfer(input: TransferInput) {
    transfers.value.push({ ...input, id: newId(), createdAt: Date.now() })
  }

  function updateTransfer(id: string, input: TransferInput) {
    const t = getTransfer(id)
    if (t) Object.assign(t, input)
  }

  function removeTransfer(id: string) {
    transfers.value = transfers.value.filter((t) => t.id !== id)
  }

  function hydrate() {
    return Promise.all([
      hydrateAndPersist<Account[]>('accounts', accounts, (saved) => { accounts.value = saved }, []),
      hydrateAndPersist<Transfer[]>('transfers', transfers, (saved) => { transfers.value = saved }, []),
    ])
  }

  return {
    accounts, transfers, visible, total, get, balanceOf, movementsOf, add, update, setBalance, remove,
    getTransfer, addTransfer, updateTransfer, removeTransfer, hydrate,
  }
})
