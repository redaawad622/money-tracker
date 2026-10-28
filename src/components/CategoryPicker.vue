<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { FAMILY_COLORS, categoryById, type CategoryGroup } from '../data/categories'
import { useCategoriesStore } from '../stores/categories'
import AppIcon from './AppIcon.vue'

const model = defineModel<string>({ required: true })
const categories = useCategoriesStore()

const GROUPS: { id: CategoryGroup; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'monthly', label: 'Monthly bills' },
]

const group = shallowRef<CategoryGroup>(categoryById(model.value).group)

// Hidden categories stay out, except the one an expense being edited already uses.
const tiles = computed(() =>
  categories.inGroup(group.value, true).filter((c) => !c.hidden || c.id === model.value).map((c) => {
    const colors = FAMILY_COLORS[c.family]
    const selected = c.id === model.value
    return {
      ...c,
      selected,
      style: {
        color: colors.ink,
        background: selected ? colors.tint : 'var(--card)',
        borderColor: selected ? colors.ink : 'var(--line)',
        borderWidth: selected ? '2px' : '1px',
      },
    }
  }),
)

function pickGroup(id: CategoryGroup) {
  if (group.value === id) return
  group.value = id
  const first = categories.inGroup(id)[0] ?? categories.inGroup(id, true)[0]
  if (first) model.value = first.id
}
</script>

<template>
  <div class="picker">
    <div class="segments" role="group" aria-label="Category type">
      <button
        v-for="g in GROUPS"
        :key="g.id"
        type="button"
        class="segment"
        :class="{ 'segment--on': group === g.id }"
        :aria-pressed="group === g.id"
        @click="pickGroup(g.id)"
      >
        {{ g.label }}
      </button>
    </div>
    <div class="grid">
      <button
        v-for="tile in tiles"
        :key="tile.id"
        type="button"
        class="tile"
        :style="tile.style"
        :aria-pressed="tile.selected"
        @click="model = tile.id"
      >
        <AppIcon :name="tile.icon" />
        <span class="tile-name">{{ tile.name }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.picker { display: flex; flex-direction: column; gap: 10px; }
.segments {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px;
  background: #E7EAE4; border-radius: 14px; padding: 4px;
}
.segment { height: 36px; border: 0; border-radius: 10px; background: transparent; font-size: 13px; font-weight: 700; }
.segment--on { background: var(--card); box-shadow: 0 1px 3px rgba(21, 32, 27, 0.12); }
.grid {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px;
  max-height: 196px; overflow-y: auto;
}
.tile {
  height: 60px; border-style: solid; border-radius: 14px; padding: 0 2px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
}
.tile-name { color: var(--ink); font-size: 11px; font-weight: 700; line-height: 1.15; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
</style>
