<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import LockScreen from './components/LockScreen.vue'
import TabBar from './components/TabBar.vue'
import { useAppLock } from './composables/useAppLock'

const route = useRoute()
const showTabs = computed(() => route.meta.tabs === true)
const lock = useAppLock()
</script>

<template>
  <RouterView />
  <TabBar v-if="showTabs" />
  <LockScreen v-if="lock.locked.value" />
</template>
