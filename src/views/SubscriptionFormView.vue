<script setup lang="ts">
import { t } from '../i18n'
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { todayYmd } from '../lib/dates'
import type { IntervalMonths } from '../lib/subscriptions'
import { useSettingsStore } from '../stores/settings'
import { useSubscriptionsStore } from '../stores/subscriptions'

const route = useRoute()
const router = useRouter()
const subs = useSubscriptionsStore()
const { settings } = useSettingsStore()

const editing = typeof route.params.id === 'string' ? subs.get(route.params.id) : undefined

const name = shallowRef(editing?.name ?? '')
const amount = shallowRef<number | ''>(editing?.amount ?? '')
const intervalMonths = shallowRef<IntervalMonths>(editing?.intervalMonths ?? 1)
const anchor = shallowRef(editing?.anchor ?? todayYmd())

const INTERVALS: { value: IntervalMonths; label: string }[] = [
  { value: 1, label: 'Every month' },
  { value: 3, label: 'Every 3 months' },
]

const canSave = computed(() => name.value.trim() !== '' && typeof amount.value === 'number' && amount.value > 0 && anchor.value !== '')

function save() {
  if (!canSave.value || typeof amount.value !== 'number') return
  const input = { name: name.value.trim(), amount: Math.round(amount.value * 100) / 100, intervalMonths: intervalMonths.value, anchor: anchor.value }
  if (editing) subs.update(editing.id, input)
  else subs.add(input)
  void router.replace('/fixed')
}

function remove() {
  if (!editing || !window.confirm(t('Delete "{name}"?', { name: editing.name }))) return
  subs.remove(editing.id)
  void router.replace('/fixed')
}
</script>

<template>
  <main class="page page--no-tabs">
    <header class="header">
      <RouterLink to="/fixed" class="icon-btn" :aria-label="t('Close')"><AppIcon name="close" /></RouterLink>
      <h1 class="title">{{ editing ? t('Edit subscription') : t('New subscription') }}</h1>
      <div class="spacer" />
    </header>

    <form class="fields" @submit.prevent="save">
      <label class="field">
        {{ t('Name') }}
        <input v-model="name" type="text" :placeholder="t('e.g. Streaming, gym, insurance')" maxlength="40" required />
      </label>
      <label class="field">
        {{ t('Amount ({currency})', { currency: settings.currency }) }}
        <input v-model.number="amount" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00" required />
      </label>
      <fieldset class="field interval">
        <legend class="legend">{{ t('How often') }}</legend>
        <div class="segments">
          <button
            v-for="opt in INTERVALS" :key="opt.value" type="button" class="segment"
            :class="{ 'segment--on': intervalMonths === opt.value }" :aria-pressed="intervalMonths === opt.value"
            @click="intervalMonths = opt.value"
          >{{ t(opt.label) }}</button>
        </div>
      </fieldset>
      <label class="field">
        {{ t('First payment date') }}
        <input v-model="anchor" type="date" required />
      </label>
      <p class="muted help">
        {{ intervalMonths === 1 ? t('Payments repeat every month from this date.') : t('Payments repeat every 3 months from this date.') }}
      </p>

      <button type="submit" class="primary-btn" :disabled="!canSave">
        <AppIcon name="check" :stroke-width="2.4" /> {{ t('Save') }}
      </button>
      <button v-if="editing" type="button" class="danger-btn" @click="remove">
        <AppIcon name="trash" /> {{ t('Delete subscription') }}
      </button>
    </form>
  </main>
</template>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; min-height: 48px; }
.title { font-size: 17px; font-weight: 800; }
.spacer { width: 44px; }
.fields { display: flex; flex-direction: column; gap: 16px; }
.interval { border: 0; margin: 0; padding: 0; }
.legend { padding: 0 0 6px; font-size: 13px; font-weight: 700; }
.segments { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; background: #E7EAE4; border-radius: 14px; padding: 4px; }
.segment { height: 40px; border: 0; border-radius: 10px; background: transparent; font-size: 14px; font-weight: 700; }
.segment--on { background: var(--card); box-shadow: 0 1px 3px rgba(21, 32, 27, 0.12); }
.help { font-size: 13px; font-weight: 500; margin-top: -8px; }
</style>
