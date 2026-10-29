<script setup lang="ts">
import { t } from '../i18n'
import { computed, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { FAMILY_COLORS, type CategoryGroup } from '../data/categories'
import { useCategoriesStore } from '../stores/categories'

const route = useRoute()
const categories = useCategoriesStore()

const GROUPS: { id: CategoryGroup; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'monthly', label: 'Monthly bills' },
]
const group = shallowRef<CategoryGroup>(route.query.group === 'monthly' ? 'monthly' : 'daily')

const rows = computed(() =>
  categories.inGroup(group.value, true).map((c) => {
    const colors = FAMILY_COLORS[c.family]
    return { ...c, style: { color: colors.ink, background: colors.tint } }
  }),
)
</script>

<template>
  <main class="page page--no-tabs">
    <header class="header">
      <RouterLink to="/settings" class="icon-btn icon-btn--plain" :aria-label="t('Back to settings')"><AppIcon name="back" /></RouterLink>
      <h1 class="title">{{ t('Categories') }}</h1>
      <RouterLink :to="{ path: '/categories/new', query: { group } }" class="icon-btn icon-btn--accent" :aria-label="t('Add category')">
        <AppIcon name="plus" />
      </RouterLink>
    </header>

    <div class="segments" role="group" :aria-label="t('Category type')">
      <button
        v-for="g in GROUPS" :key="g.id" type="button" class="segment"
        :class="{ 'segment--on': group === g.id }" :aria-pressed="group === g.id"
        @click="group = g.id"
      >{{ t(g.label) }}</button>
    </div>

    <p class="muted help">{{ t('Tap a category to rename it, change its icon or colour, or hide it from the list when adding an expense. Hidden ones still show on past expenses.') }}</p>

    <section class="card list">
      <RouterLink v-for="c in rows" :key="c.id" :to="`/categories/${c.id}`" class="row" :class="{ 'row--hidden': c.hidden }">
        <span class="row-icon" :style="c.style"><AppIcon :name="c.icon" :size="20" /></span>
        <span class="row-name">{{ c.name }}</span>
        <span v-if="c.hidden" class="tag">{{ t('Hidden') }}</span>
        <span v-else-if="c.custom" class="tag tag--custom">{{ t('Yours') }}</span>
        <AppIcon name="forward" :size="18" class="row-go" />
      </RouterLink>
    </section>
  </main>
</template>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; min-height: 48px; margin-inline-start: -10px; }
.title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; flex: 1 1 auto; }
.segments { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; background: #E7EAE4; border-radius: 14px; padding: 4px; }
.segment { height: 40px; border: 0; border-radius: 10px; background: transparent; font-size: 14px; font-weight: 700; }
.segment--on { background: var(--card); box-shadow: 0 1px 3px rgba(21, 32, 27, 0.12); }
.help { font-size: 13px; font-weight: 500; line-height: 1.45; }
.list { padding: 4px 16px; display: flex; flex-direction: column; }
.row { display: flex; align-items: center; gap: 12px; min-height: 56px; border-bottom: 1px solid var(--line-soft); }
.row:last-child { border-bottom: 0; }
.row--hidden .row-icon, .row--hidden .row-name { opacity: 0.5; }
.row-icon { width: 36px; height: 36px; border-radius: 11px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; }
.row-name { flex: 1 1 auto; font-size: 15px; font-weight: 700; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tag { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 99px; background: var(--line-soft); color: var(--muted); }
.tag--custom { background: var(--accent-soft); color: var(--accent-ink); }
.row-go { color: var(--muted); flex: 0 0 auto; }
</style>
