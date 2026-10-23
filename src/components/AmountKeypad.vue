<script setup lang="ts">
import AppIcon from './AppIcon.vue'

/** The amount being typed, as text ("12.75"), so trailing "." and "0" survive while typing. */
const model = defineModel<string>({ required: true })

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'] as const

function press(key: (typeof KEYS)[number]) {
  const a = model.value
  if (key === 'del') {
    model.value = a.length > 1 ? a.slice(0, -1) : '0'
  } else if (key === '.') {
    if (!a.includes('.')) model.value = a + '.'
  } else {
    const dot = a.indexOf('.')
    if (dot >= 0 && a.length - dot > 2) return
    if (a.replace('.', '').length >= 8) return
    model.value = a === '0' ? key : a + key
  }
}

function ariaLabel(key: string) {
  return key === 'del' ? 'Delete' : key === '.' ? 'Decimal point' : key
}
</script>

<template>
  <div class="keypad">
    <button v-for="key in KEYS" :key="key" type="button" class="key" :aria-label="ariaLabel(key)" @click="press(key)">
      <AppIcon v-if="key === 'del'" name="backspace" :size="24" />
      <template v-else>{{ key }}</template>
    </button>
  </div>
</template>

<style scoped>
.keypad { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.key {
  height: 52px; border: 0; border-radius: 14px; background: var(--card);
  font-size: 22px; font-weight: 700; display: flex; align-items: center; justify-content: center;
}
.key:active { background: var(--line-soft); }
</style>
