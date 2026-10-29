<script setup lang="ts">
import { t } from '../i18n'
import { nextTick, onMounted, ref, shallowRef } from 'vue'
import AppIcon from './AppIcon.vue'
import { useIncomeLock } from '../composables/useIncomeLock'

const lock = useIncomeLock()
const password = shallowRef('')
const wrong = shallowRef(false)
const busy = shallowRef(false)
const field = ref<HTMLInputElement>()

onMounted(() => field.value?.focus())

async function submit() {
  if (!password.value || busy.value) return
  busy.value = true
  const ok = await lock.unlock(password.value)
  busy.value = false
  wrong.value = !ok
  password.value = ''
  if (!ok) await nextTick(() => field.value?.focus())
}
</script>

<template>
  <main class="page lock">
    <span class="lock-icon"><AppIcon name="coins" :size="28" /></span>
    <h1 class="title">{{ t('Income is locked') }}</h1>
    <p class="muted sub">{{ t('Enter your Income password.') }}</p>
    <form class="form" @submit.prevent="submit">
      <label class="field">
        <span class="visually-hidden">{{ t('Password') }}</span>
        <input
          ref="field"
          v-model="password"
          type="password"
          autocomplete="current-password"
          :aria-invalid="wrong"
          aria-describedby="income-lock-error"
          :placeholder="t('Password')"
        />
      </label>
      <p id="income-lock-error" class="error" role="alert">{{ wrong ? t('Wrong password. Try again.') : '' }}</p>
      <button type="submit" class="primary-btn" :disabled="!password || busy">{{ t('Unlock') }}</button>
    </form>
  </main>
</template>

<style scoped>
.lock { align-items: center; justify-content: center; text-align: center; gap: 6px; }
.lock-icon {
  width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center;
  background: var(--accent-soft); color: var(--accent-ink); margin-bottom: 8px;
}
.title { font-size: 20px; font-weight: 800; }
.sub { font-size: 14px; font-weight: 600; }
.form { width: 100%; max-width: 320px; display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
.form .field input { text-align: center; }
.error { min-height: 18px; font-size: 13px; font-weight: 600; color: var(--warn-ink); }
</style>
