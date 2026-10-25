<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import IncomeLock from './components/IncomeLock.vue'
import LockScreen from './components/LockScreen.vue'
import TabBar from './components/TabBar.vue'
import { useAppLock } from './composables/useAppLock'
import { useIncomeLock } from './composables/useIncomeLock'

const route = useRoute()
const showTabs = computed(() => route.meta.tabs === true)
const lock = useAppLock()
const incomeLock = useIncomeLock()

// Income asks for its password each time it's opened from another screen.
const inIncome = computed(() => route.path.startsWith('/income'))
watch(inIncome, (now) => {
  if (!now) incomeLock.lock()
})
const incomeLocked = computed(() => inIncome.value && !!incomeLock.stored.value && !incomeLock.unlocked.value)
</script>

<template>
  <IncomeLock v-if="incomeLocked" />
  <RouterView v-else />
  <TabBar v-if="showTabs" />
  <LockScreen v-if="lock.locked.value" />
</template>
