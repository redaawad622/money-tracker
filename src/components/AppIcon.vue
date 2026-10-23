<script setup lang="ts">
import { ICONS, type IconName } from '../data/icons'

const { name, size = 20, strokeWidth = 2 } = defineProps<{ name: IconName; size?: number; strokeWidth?: number }>()
</script>

<template>
  <svg
    aria-hidden="true"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path :d="ICONS[name]" />
  </svg>
</template>
