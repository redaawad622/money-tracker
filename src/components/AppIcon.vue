<script setup lang="ts">
import { ICONS, type IconName } from '../data/icons'

const { name, size = 20, strokeWidth = 2 } = defineProps<{ name: IconName; size?: number; strokeWidth?: number }>()

// Arrows point the other way in a right-to-left layout.
const FLIP = new Set<IconName>(['back', 'forward', 'backspace'])
</script>

<template>
  <svg
    aria-hidden="true"
    :class="{ 'icon-flip': FLIP.has(name) }"
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
