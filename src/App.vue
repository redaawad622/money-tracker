<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from './components/TabBar.vue'

const route = useRoute()
const showTabs = computed(() => route.meta.tabs === true)
</script>

<template>
  <RouterView />
  <TabBar v-if="showTabs" />
</template>
