<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import ToggleSwitch from '../components/ToggleSwitch.vue'
import { ACCOUNT_KINDS, type AccountKind } from '../lib/accounts'
import { useAccountsStore } from '../stores/accounts'
import { useSettingsStore } from '../stores/settings'

const route = useRoute()
const router = useRouter()
const accounts = useAccountsStore()
const { settings } = useSettingsStore()

const editing = typeof route.params.id === 'string' ? accounts.get(route.params.id) : undefined
const name = shallowRef(editing?.name ?? '')
const kind = shallowRef<AccountKind>(editing?.kind ?? 'cash')
const startBalance = shallowRef<number | ''>('')
const shown = shallowRef(!editing?.hidden)
const back = editing ? `/accounts/${editing.id}` : '/accounts'

const PLACEHOLDERS: Record<AccountKind, string> = {
  cash: 'e.g. Cash, Home cash',
  bank: 'e.g. CIB, Banque Misr',
  card: 'e.g. Visa, Credit card',
  wallet: 'e.g. InstaPay, Vodafone Cash',
}

const canSave = computed(() => name.value.trim() !== '')

function save() {
  if (!canSave.value) return
  const input = { name: name.value.trim(), kind: kind.value, hidden: shown.value ? undefined : true }
  if (editing) {
    accounts.update(editing.id, input)
    void router.replace(back)
  } else {
    const opening = typeof startBalance.value === 'number' ? Math.round(startBalance.value * 100) / 100 : 0
    void router.replace(`/accounts/${accounts.add(input, opening).id}`)
  }
}

function remove() {
  if (!editing) return
  if (!window.confirm(`Delete "${editing.name}" and its transfers? Expenses paid with it stay, just without an account.`)) return
  accounts.remove(editing.id)
  void router.replace('/accounts')
}
</script>

<template>
  <main class="page page--no-tabs">
    <header class="header">
      <RouterLink :to="back" class="icon-btn" aria-label="Close"><AppIcon name="close" /></RouterLink>
      <h1 class="title">{{ editing ? 'Edit account' : 'New account' }}</h1>
      <div class="spacer" />
    </header>

    <form class="fields" @submit.prevent="save">
      <fieldset class="field set">
        <legend class="legend">Type</legend>
        <div class="kinds">
          <button
            v-for="k in ACCOUNT_KINDS" :key="k.id" type="button" class="kind"
            :class="{ 'kind--on': kind === k.id }" :aria-pressed="kind === k.id" @click="kind = k.id"
          ><AppIcon :name="k.icon" />{{ k.label }}</button>
        </div>
      </fieldset>
      <label class="field">
        Name
        <input v-model="name" type="text" :placeholder="PLACEHOLDERS[kind]" maxlength="30" required />
      </label>
      <label v-if="!editing" class="field">
        What's in it right now ({{ settings.currency }})
        <input v-model.number="startBalance" type="number" inputmode="decimal" step="0.01" placeholder="0.00" />
      </label>
      <p v-if="!editing" class="muted help">From here on, expenses paid with it and transfers keep the balance up to date. You can correct it any time with "Set balance".</p>
      <div v-if="editing" class="card show-row">
        <div class="show-text">
          <span class="show-title">Show when adding expenses</span>
          <span class="muted help">A hidden account keeps its history and stays out of the total.</span>
        </div>
        <ToggleSwitch v-model="shown" label="Show when adding expenses" />
      </div>

      <button type="submit" class="primary-btn" :disabled="!canSave">
        <AppIcon name="check" :stroke-width="2.4" /> Save
      </button>
      <button v-if="editing" type="button" class="danger-btn" @click="remove">
        <AppIcon name="trash" /> Delete account
      </button>
    </form>
  </main>
</template>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; min-height: 48px; }
.title { font-size: 17px; font-weight: 800; }
.spacer { width: 44px; }
.fields { display: flex; flex-direction: column; gap: 16px; }
.set { border: 0; margin: 0; padding: 0; }
.legend { padding: 0 0 6px; font-size: 13px; font-weight: 700; }
.kinds { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.kind {
  height: 52px; border: 1px solid var(--line); border-radius: 14px; background: var(--card); color: var(--muted);
  display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; font-weight: 700;
}
.kind--on { border: 2px solid var(--accent); background: var(--accent-soft); color: var(--accent-ink); }
.help { font-size: 12px; font-weight: 500; line-height: 1.45; }
p.help { margin-top: -8px; }
.show-row { display: flex; align-items: center; gap: 12px; }
.show-text { flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.show-title { font-size: 14px; font-weight: 700; }
</style>
