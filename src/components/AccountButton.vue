<script setup lang="ts">
import { computed } from 'vue'
import { useAccount } from '../composables/useAccount'
import AppIcon from './AppIcon.vue'

// Account shortcut for page headers: "Sign in" when signed out, your initial when signed in.
const account = useAccount()
const show = computed(() => account.enabled && (!!account.user.value || !!account.providers.value?.length))
const initial = computed(() => (account.user.value?.email?.[0] ?? '?').toUpperCase())
</script>

<template>
  <template v-if="show">
    <RouterLink v-if="account.user.value" to="/settings" aria-label="Account" class="avatar">
      {{ initial }}
      <span v-if="account.state.value !== 'idle'" class="dot" :class="{ 'dot--error': account.state.value === 'error' }" />
    </RouterLink>
    <RouterLink v-else to="/settings" class="sign-in">
      <AppIcon name="user" :size="18" />Sign in
    </RouterLink>
  </template>
</template>

<style scoped>
.avatar {
  position: relative; width: 40px; height: 40px; flex: 0 0 auto; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--accent-soft); color: var(--accent-ink); font-size: 16px; font-weight: 800;
}
.dot {
  position: absolute; top: -1px; right: -1px; width: 12px; height: 12px; border-radius: 50%;
  background: var(--accent); box-shadow: 0 0 0 2px var(--ground); animation: pulse 1.2s ease-in-out infinite;
}
.dot--error { background: var(--warn); animation: none; }
.sign-in {
  height: 40px; padding: 0 12px; flex: 0 0 auto; border: 1px solid var(--line); border-radius: 14px;
  background: var(--card); display: inline-flex; align-items: center; gap: 6px;
  font-size: 14px; font-weight: 700; color: var(--accent-ink);
}
@keyframes pulse { 50% { opacity: 0.4; } }
@media (prefers-reduced-motion: reduce) { .dot { animation: none; } }
</style>
