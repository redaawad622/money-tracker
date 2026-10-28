<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AmountKeypad from '../components/AmountKeypad.vue'
import AppIcon from '../components/AppIcon.vue'
import CategoryPicker from '../components/CategoryPicker.vue'
import ToggleSwitch from '../components/ToggleSwitch.vue'
import { categoryById } from '../data/categories'
import { todayYmd } from '../lib/dates'
import { ACCOUNT_KINDS } from '../lib/accounts'
import { formatMoney } from '../lib/money'
import { deleteReceipt, loadReceipt, saveReceipt } from '../lib/receipts'
import { useAccountsStore } from '../stores/accounts'
import { useExpensesStore } from '../stores/expenses'
import { useRewardsStore } from '../stores/rewards'
import { useSettingsStore } from '../stores/settings'

const route = useRoute()
const router = useRouter()
const expenses = useExpensesStore()
const rewards = useRewardsStore()
const accounts = useAccountsStore()
const { settings } = useSettingsStore()

const editing = typeof route.params.id === 'string' ? expenses.get(route.params.id) : undefined
const queryDate = typeof route.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.date) ? route.query.date : null

const amountText = shallowRef(editing ? String(editing.amount) : '0')
const categoryId = shallowRef(editing?.categoryId ?? 'lunch')
const note = shallowRef(editing?.note ?? '')
const date = shallowRef(editing?.date ?? queryDate ?? todayYmd())
const fromRewards = shallowRef(editing?.fromRewards ?? false)
const store = shallowRef(editing?.store ?? '')

// A new expense starts with the account the last one was paid with.
const lastAccount = [...expenses.expenses].sort((a, b) => b.createdAt - a.createdAt).find((e) => e.accountId)?.accountId
const accountId = shallowRef<string | undefined>(editing ? editing.accountId : lastAccount && accounts.get(lastAccount) ? lastAccount : undefined)
const accountChoices = computed(() =>
  accounts.accounts
    .filter((a) => !a.hidden || a.id === accountId.value)
    .map((a) => ({ ...a, icon: ACCOUNT_KINDS.find((k) => k.id === a.kind)!.icon })),
)

// Places bought from before, most used first, offered while typing.
const storeSuggestions = computed(() => {
  const counts = new Map<string, number>()
  for (const e of expenses.expenses) if (e.store) counts.set(e.store, (counts.get(e.store) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([name]) => name)
})

// The receipt photo: picked photos are only written when the expense is saved.
const receipt = shallowRef(editing?.receipt)
const picked = shallowRef<File | null>(null)
const preview = shallowRef<string | null>(null)
const receiptMissing = shallowRef(false)
const viewing = shallowRef(false)
const saving = shallowRef(false)
const fileInput = shallowRef<HTMLInputElement | null>(null)

onMounted(async () => {
  if (!receipt.value) return
  preview.value = await loadReceipt(receipt.value)
  receiptMissing.value = !preview.value
})
onBeforeUnmount(() => {
  if (preview.value?.startsWith('blob:')) URL.revokeObjectURL(preview.value)
})

function onPick(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (preview.value?.startsWith('blob:')) URL.revokeObjectURL(preview.value)
  picked.value = file
  preview.value = URL.createObjectURL(file)
  receiptMissing.value = false
}

function forgetPhoto() {
  if (window.confirm('This receipt photo was taken on another device, so it can only be seen there. Remove it from this expense?')) removePhoto()
}

function removePhoto() {
  if (preview.value?.startsWith('blob:')) URL.revokeObjectURL(preview.value)
  picked.value = null
  preview.value = null
  receipt.value = undefined
  receiptMissing.value = false
  viewing.value = false
}

const amount = computed(() => Number.parseFloat(amountText.value) || 0)
const canSave = computed(() => amount.value > 0 && date.value !== '')
const category = computed(() => categoryById(categoryId.value))
const heading = editing ? 'Edit expense' : 'Add expense'
// The pot as it would be without this expense, so editing one shows what it can use.
const potBefore = computed(() => rewards.balance + (editing?.fromRewards ? editing.amount : 0))
const showRewards = computed(() => fromRewards.value || potBefore.value > 0)

async function save() {
  if (!canSave.value || saving.value) return
  saving.value = true
  let photo = receipt.value
  if (picked.value) {
    try {
      photo = await saveReceipt(picked.value)
    } catch {
      saving.value = false
      window.alert("Couldn't save the photo. Try another one, or save without it.")
      return
    }
  }
  const input = {
    amount: Math.round(amount.value * 100) / 100,
    categoryId: categoryId.value,
    note: note.value.trim(),
    date: date.value,
    fromRewards: fromRewards.value,
    store: store.value.trim() || undefined,
    accountId: accountId.value,
    receipt: photo,
  }
  if (editing) {
    if (editing.receipt && editing.receipt !== photo) void deleteReceipt(editing.receipt)
    expenses.update(editing.id, input)
  } else expenses.add(input)
  void router.replace(`/day/${date.value}`)
}

function remove() {
  if (!editing) return
  if (!window.confirm('Delete this expense?')) return
  if (editing.receipt) void deleteReceipt(editing.receipt)
  expenses.remove(editing.id)
  void router.replace(`/day/${editing.date}`)
}

function close() {
  if (window.history.length > 1) router.back()
  else void router.replace('/')
}
</script>

<template>
  <main class="page page--no-tabs form">
    <header class="header">
      <button type="button" class="icon-btn" aria-label="Close" @click="close"><AppIcon name="close" /></button>
      <h1 class="title">{{ heading }}</h1>
      <button v-if="editing" type="button" class="icon-btn" aria-label="Delete expense" @click="remove"><AppIcon name="trash" /></button>
      <div v-else class="spacer" />
    </header>

    <section class="amount" aria-live="polite">
      <span class="muted amount-label">{{ category.name }}<template v-if="category.group === 'monthly'"> · monthly bill</template></span>
      <div class="amount-value">
        <span class="currency">{{ settings.currency }}</span>
        <span class="digits">{{ amountText }}</span>
      </div>
    </section>

    <CategoryPicker v-model="categoryId" />

    <div class="meta">
      <label class="note">
        <span class="visually-hidden">Note</span>
        <AppIcon name="pencil" :size="18" />
        <input v-model="note" type="text" placeholder="Add a note" maxlength="80" />
      </label>
      <label class="date">
        <span class="visually-hidden">Date</span>
        <input v-model="date" type="date" :max="todayYmd()" />
      </label>
    </div>

    <div class="meta">
      <label class="note">
        <span class="visually-hidden">Store</span>
        <AppIcon name="store" :size="18" />
        <input v-model="store" type="text" list="store-suggestions" placeholder="Store (optional)" maxlength="40" />
      </label>
      <datalist id="store-suggestions">
        <option v-for="s in storeSuggestions" :key="s" :value="s" />
      </datalist>
      <button v-if="preview" type="button" class="photo photo--thumb" aria-label="View receipt photo" @click="viewing = true">
        <img :src="preview" alt="" />
      </button>
      <button v-else-if="receiptMissing" type="button" class="photo" aria-label="Receipt photo is on another device" @click="forgetPhoto">
        <AppIcon name="camera" :size="18" /><span class="photo-label">Other device</span>
      </button>
      <button v-else type="button" class="photo" aria-label="Add receipt photo" @click="fileInput?.click()">
        <AppIcon name="camera" :size="18" /><span class="photo-label">Receipt</span>
      </button>
      <input ref="fileInput" type="file" accept="image/*" class="visually-hidden" tabindex="-1" @change="onPick" />
    </div>

    <div v-if="accountChoices.length" class="paid-with" role="group" aria-label="Paid with">
      <button type="button" class="chip" :class="{ 'chip--on': !accountId }" :aria-pressed="!accountId" @click="accountId = undefined">Not set</button>
      <button
        v-for="a in accountChoices" :key="a.id" type="button" class="chip"
        :class="{ 'chip--on': accountId === a.id }" :aria-pressed="accountId === a.id" @click="accountId = a.id"
      ><AppIcon :name="a.icon" :size="16" />{{ a.name }}</button>
    </div>

    <div v-if="showRewards" class="rewards">
      <span class="rewards-text">
        <span class="rewards-title">Pay from rewards</span>
        <span class="muted rewards-sub" :class="{ 'rewards-sub--over': fromRewards && amount > potBefore }">
          {{ formatMoney(potBefore, settings.currency) }} in the pot · not counted in the budget
        </span>
      </span>
      <ToggleSwitch v-model="fromRewards" label="Pay from rewards" />
    </div>

    <AmountKeypad v-model="amountText" />

    <button type="button" class="primary-btn" :disabled="!canSave || saving" @click="save">
      <AppIcon name="check" :stroke-width="2.4" /> Save expense
    </button>

    <div v-if="viewing && preview" class="viewer" role="dialog" aria-label="Receipt photo" @click.self="viewing = false">
      <img :src="preview" alt="Receipt" class="viewer-img" />
      <div class="viewer-actions">
        <button type="button" class="viewer-btn" @click="fileInput?.click()">Replace</button>
        <button type="button" class="viewer-btn" @click="removePhoto">Remove</button>
        <button type="button" class="viewer-btn viewer-btn--main" @click="viewing = false">Done</button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.form { gap: 12px; }
.header { display: flex; align-items: center; justify-content: space-between; min-height: 48px; }
.title { font-size: 17px; font-weight: 800; }
.spacer { width: 44px; }
.amount { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.amount-label { font-size: 13px; font-weight: 600; }
.amount-value { display: flex; align-items: baseline; gap: 6px; }
.currency { font-size: 24px; font-weight: 700; color: var(--muted); }
.digits { font-size: 48px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; }
.meta { display: flex; gap: 8px; }
.note, .date {
  height: 46px; display: flex; align-items: center; gap: 8px;
  background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 0 12px;
}
.note { flex: 1 1 auto; color: var(--muted); min-width: 0; }
.note input, .date input { border: 0; outline: none; background: transparent; font-size: 14px; font-weight: 600; min-width: 0; }
.note input { flex: 1 1 auto; color: var(--ink); }
.date { flex: 0 0 auto; }
.photo {
  height: 46px; flex: 0 0 auto; display: flex; align-items: center; gap: 6px; padding: 0 12px;
  background: var(--card); border: 1px solid var(--line); border-radius: 14px; color: var(--muted);
}
.photo-label { font-size: 13px; font-weight: 700; }
.photo--thumb { width: 46px; padding: 0; overflow: hidden; }
.photo--thumb img { width: 100%; height: 100%; object-fit: cover; }
.paid-with { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
.chip {
  height: 36px; flex: 0 0 auto; display: flex; align-items: center; gap: 6px; padding: 0 12px;
  border: 1px solid var(--line); border-radius: 99px; background: var(--card); font-size: 13px; font-weight: 700; color: var(--muted);
}
.chip--on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent-ink); }
.viewer {
  position: fixed; inset: 0; z-index: 50; background: rgba(10, 16, 13, 0.92);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
  padding: calc(16px + var(--safe-top)) 16px calc(16px + var(--safe-bottom));
}
.viewer-img { max-width: 100%; max-height: calc(100% - 80px); object-fit: contain; border-radius: 12px; }
.viewer-actions { display: flex; gap: 8px; }
.viewer-btn { height: 44px; padding: 0 18px; border: 0; border-radius: 14px; background: rgba(255, 255, 255, 0.14); color: #fff; font-weight: 700; }
.viewer-btn--main { background: #fff; color: var(--ink); }
.rewards {
  display: flex; align-items: center; gap: 12px; min-height: 52px;
  background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 8px 12px;
}
.rewards-text { flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.rewards-title { font-size: 14px; font-weight: 700; }
.rewards-sub { font-size: 12px; font-weight: 600; }
.rewards-sub--over { color: var(--warn-ink); }
</style>
