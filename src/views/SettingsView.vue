<script setup lang="ts">
import { CURRENCIES } from '../lib/money'
import { useSettingsStore } from '../stores/settings'

const { settings } = useSettingsStore()
</script>

<template>
  <main class="page">
    <header class="header">
      <h1 class="title">Settings</h1>
    </header>
    <section class="card fields">
      <label class="field">
        Monthly budget
        <input v-model.number="settings.monthlyBudget" type="number" inputmode="decimal" min="0" step="50" />
      </label>
      <label class="field">
        Currency
        <select v-model="settings.currency">
          <option v-for="c in CURRENCIES" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
      <label class="check">
        <input v-model="settings.includeSubscriptionsInBudget" type="checkbox" />
        Count fixed subscriptions in the monthly budget
      </label>
    </section>
    <p class="muted note">Your data is saved on this device only.</p>
  </main>
</template>

<style scoped>
.header { min-height: 48px; display: flex; align-items: center; }
.title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
.fields { display: flex; flex-direction: column; gap: 16px; }
.check { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; min-height: 44px; }
.check input { width: 20px; height: 20px; accent-color: var(--accent); }
.note { font-size: 13px; font-weight: 500; text-align: center; }
</style>
