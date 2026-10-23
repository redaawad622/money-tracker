<script setup lang="ts">
import { computed } from 'vue'

export interface DayBar { date: string; day: number; amount: number | null; isToday: boolean }

const { bars, dailyBudget } = defineProps<{ bars: DayBar[]; dailyBudget: number }>()

const HEIGHT = 112

const scaleMax = computed(() => Math.max(dailyBudget, ...bars.map((b) => b.amount ?? 0), 1))

const drawn = computed(() =>
  bars.map((b) => {
    const tone = b.amount === null ? 'future' : b.isToday ? 'today' : b.amount > dailyBudget ? 'over' : 'normal'
    const h = b.amount ? Math.max(4, Math.round((b.amount / scaleMax.value) * HEIGHT)) : 4
    return { date: b.date, height: `${h}px`, tone }
  }),
)

const limitStyle = computed(() => ({ bottom: `${Math.round((dailyBudget / scaleMax.value) * HEIGHT)}px` }))
const lastDay = computed(() => bars.length)
</script>

<template>
  <div class="chart" role="img" aria-label="Spending per day this month">
    <div class="limit" :style="limitStyle" />
    <div v-for="bar in drawn" :key="bar.date" class="bar" :class="`bar--${bar.tone}`" :style="{ height: bar.height }" />
  </div>
  <div class="axis">
    <span>1</span><span>8</span><span>15</span><span>22</span><span>{{ lastDay }}</span>
  </div>
  <div class="legend">
    <span class="key"><span class="swatch swatch--today" />Today</span>
    <span class="key"><span class="swatch swatch--over" />Over daily budget</span>
    <span class="key"><span class="dash" />Daily budget</span>
  </div>
</template>

<style scoped>
.chart { position: relative; height: 112px; display: flex; align-items: flex-end; gap: 3px; }
.limit { position: absolute; left: 0; right: 0; border-top: 1px dashed #9AA39D; }
.bar { flex: 1 1 0; border-radius: 3px; background: var(--accent-bar); }
.bar--today { background: var(--accent); }
.bar--over { background: var(--warn); }
.bar--future { background: var(--line); }
.axis, .legend { display: flex; font-size: 11px; font-weight: 600; color: var(--muted); }
.axis { justify-content: space-between; margin-top: 10px; }
.legend { gap: 14px; margin-top: 10px; flex-wrap: wrap; }
.key { display: flex; align-items: center; gap: 6px; }
.swatch { width: 10px; height: 10px; border-radius: 3px; }
.swatch--today { background: var(--accent); }
.swatch--over { background: var(--warn); }
.dash { width: 12px; border-top: 1px dashed #9AA39D; }
</style>
