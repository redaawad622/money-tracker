<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { IconName } from '../data/icons'
import AppIcon from './AppIcon.vue'

interface Tab { to: string; name: string; label: string; icon: IconName }

const LEFT: Tab[] = [
  { to: '/', name: 'overview', label: 'Overview', icon: 'chart' },
  { to: '/calendar', name: 'calendar', label: 'Calendar', icon: 'calendar' },
]
const RIGHT: Tab[] = [
  { to: '/fixed', name: 'subscriptions', label: 'Fixed', icon: 'repeat' },
  { to: '/settings', name: 'settings', label: 'Settings', icon: 'user' },
]

const route = useRoute()
const activeName = computed(() => route.name)
</script>

<template>
  <nav class="tabbar" aria-label="Main">
    <div class="tabbar-inner">
      <RouterLink
        v-for="tab in LEFT"
        :key="tab.name"
        :to="tab.to"
        class="tab"
        :class="{ 'tab--active': activeName === tab.name }"
        :aria-current="activeName === tab.name ? 'page' : undefined"
      >
        <AppIcon :name="tab.icon" :size="22" />{{ tab.label }}
      </RouterLink>
      <RouterLink to="/add" class="fab" aria-label="Add expense">
        <AppIcon name="plus" :size="26" :stroke-width="2.4" />
      </RouterLink>
      <RouterLink
        v-for="tab in RIGHT"
        :key="tab.name"
        :to="tab.to"
        class="tab"
        :class="{ 'tab--active': activeName === tab.name }"
        :aria-current="activeName === tab.name ? 'page' : undefined"
      >
        <AppIcon :name="tab.icon" :size="22" />{{ tab.label }}
      </RouterLink>
    </div>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 10;
  background: var(--card); border-top: 1px solid var(--line);
  padding-bottom: var(--safe-bottom);
}
.tabbar-inner {
  max-width: 480px; margin: 0 auto; height: var(--tabbar-h);
  display: flex; align-items: flex-start; justify-content: space-around; padding-top: 8px;
}
.tab {
  width: 64px; min-height: 44px; display: flex; flex-direction: column; align-items: center; gap: 3px;
  color: var(--muted); font-size: 11px; font-weight: 600;
}
.tab--active { color: var(--accent); font-weight: 700; }
.fab {
  width: 56px; height: 56px; margin-top: -26px; border-radius: 20px; background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(31, 111, 84, 0.35);
}
</style>
