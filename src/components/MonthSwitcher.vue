<script setup lang="ts">
import { computed } from 'vue'
import { formatMonth } from '../lib/dates'
import AppIcon from './AppIcon.vue'

const { month, canGoNext } = defineProps<{ month: string; canGoNext: boolean }>()
const emit = defineEmits<{ prev: []; next: [] }>()

const label = computed(() => formatMonth(month))
</script>

<template>
  <div class="switcher">
    <button type="button" class="icon-btn icon-btn--plain" aria-label="Previous month" @click="emit('prev')">
      <AppIcon name="back" />
    </button>
    <h1 class="label">{{ label }}</h1>
    <button type="button" class="icon-btn icon-btn--plain" aria-label="Next month" :disabled="!canGoNext" @click="emit('next')">
      <AppIcon name="forward" />
    </button>
  </div>
</template>

<style scoped>
.switcher { display: flex; align-items: center; gap: 2px; }
.label { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
</style>
