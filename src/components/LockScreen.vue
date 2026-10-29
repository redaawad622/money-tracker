<script setup lang="ts">
import { t } from '../i18n'
import { useAppLock } from '../composables/useAppLock'

const lock = useAppLock()
const logoUrl = `${import.meta.env.BASE_URL}logo.svg`
</script>

<template>
  <div class="lock" role="dialog" aria-modal="true" :aria-label="t('Money Tracker is locked')">
    <img :src="logoUrl" alt="" class="logo" width="72" height="72" />
    <span class="name">{{ t('Money Tracker') }}</span>
    <span class="muted sub">{{ t('Locked') }}</span>
    <button type="button" class="primary-btn unlock" :disabled="lock.busy.value" @click="lock.unlock()">
      {{ t('Unlock with {kind}', { kind: t(lock.kind.value) }) }}
    </button>
  </div>
</template>

<style scoped>
.lock {
  position: fixed; inset: 0; z-index: 100; background: var(--ground);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  padding: 24px max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left));
}
.logo { border-radius: 18px; margin-bottom: 8px; }
.name { font-size: 20px; font-weight: 800; }
.sub { font-size: 14px; font-weight: 600; }
.unlock { margin-top: 24px; width: 100%; max-width: 320px; }
</style>
