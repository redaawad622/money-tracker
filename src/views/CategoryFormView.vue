<script setup lang="ts">
import { t } from '../i18n'
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import ToggleSwitch from '../components/ToggleSwitch.vue'
import { CATEGORIES, CATEGORY_ICONS, FAMILY_COLORS, FAMILY_NAMES, type CategoryGroup, type Family } from '../data/categories'
import type { IconName } from '../data/icons'
import { useCategoriesStore } from '../stores/categories'
import { useExpensesStore } from '../stores/expenses'

const route = useRoute()
const router = useRouter()
const categories = useCategoriesStore()
const expenses = useExpensesStore()

const editing = typeof route.params.id === 'string' ? categories.categories.find((c) => c.id === route.params.id) : undefined
const group: CategoryGroup = editing?.group ?? (route.query.group === 'monthly' ? 'monthly' : 'daily')
const builtIn = editing ? CATEGORIES.find((c) => c.id === editing.id) : undefined
const changed = !!editing && categories.edits.some((e) => e.id === editing.id)
const used = !!editing && expenses.expenses.some((e) => e.categoryId === editing.id)

const name = shallowRef(editing?.name ?? '')
const family = shallowRef<Family>(editing?.family ?? (group === 'monthly' ? 'bills' : 'other'))
const icon = shallowRef<IconName>(editing?.icon ?? 'other')
const shown = shallowRef(!editing?.hidden)

const FAMILIES = Object.keys(FAMILY_NAMES) as Family[]
const back = { path: '/categories', query: { group } }
const canSave = computed(() => name.value.trim() !== '')

function save() {
  if (!canSave.value) return
  const fields = { name: name.value.trim(), family: family.value, icon: icon.value, hidden: !shown.value }
  if (editing) categories.update(editing.id, fields)
  else categories.add(group, fields)
  void router.replace(back)
}

function remove() {
  if (!editing) return
  const ask = builtIn ? t('Put "{name}" back as it was?', { name: t(builtIn.name) }) : t('Delete "{name}"?', { name: editing.name })
  if (!window.confirm(ask)) return
  categories.remove(editing.id)
  void router.replace(back)
}
</script>

<template>
  <main class="page page--no-tabs">
    <header class="header">
      <RouterLink :to="back" class="icon-btn" :aria-label="t('Close')"><AppIcon name="close" /></RouterLink>
      <h1 class="title">{{ editing ? t('Edit category') : group === 'monthly' ? t('New monthly bill') : t('New daily category') }}</h1>
      <div class="spacer" />
    </header>

    <form class="fields" @submit.prevent="save">
      <div class="preview" :style="{ color: FAMILY_COLORS[family].ink, background: FAMILY_COLORS[family].tint }">
        <AppIcon :name="icon" :size="28" />
        <span class="preview-name">{{ name.trim() || t('Category') }}</span>
      </div>
      <label class="field">
        {{ t('Name') }}
        <input v-model="name" type="text" :placeholder="t('e.g. Maintenance, Pets, Gym')" maxlength="24" required />
      </label>
      <fieldset class="field set">
        <legend class="legend">{{ t('Colour') }}</legend>
        <div class="swatches">
          <button
            v-for="f in FAMILIES" :key="f" type="button" class="swatch"
            :class="{ 'swatch--on': family === f }" :aria-pressed="family === f"
            :style="{ background: FAMILY_COLORS[f].tint, color: FAMILY_COLORS[f].ink, borderColor: family === f ? FAMILY_COLORS[f].ink : 'transparent' }"
            @click="family = f"
          >{{ t(FAMILY_NAMES[f]) }}</button>
        </div>
      </fieldset>
      <fieldset class="field set">
        <legend class="legend">{{ t('Icon') }}</legend>
        <div class="icons">
          <button
            v-for="i in CATEGORY_ICONS" :key="i" type="button" class="icon-tile"
            :class="{ 'icon-tile--on': icon === i }" :aria-pressed="icon === i" :aria-label="i"
            @click="icon = i"
          ><AppIcon :name="i" /></button>
        </div>
      </fieldset>
      <div class="card show-row">
        <div class="show-text">
          <span class="show-title">{{ t('Show when adding expenses') }}</span>
          <span class="muted show-hint">{{ t('Hidden categories stay on past expenses and in reports.') }}</span>
        </div>
        <ToggleSwitch v-model="shown" :label="t('Show when adding expenses')" />
      </div>

      <button type="submit" class="primary-btn" :disabled="!canSave">
        <AppIcon name="check" :stroke-width="2.4" /> {{ t('Save') }}
      </button>
      <button v-if="editing && builtIn && changed" type="button" class="danger-btn" @click="remove">
        <AppIcon name="repeat" /> {{ t('Reset to "{name}"', { name: t(builtIn.name) }) }}
      </button>
      <template v-if="editing && !builtIn">
        <button v-if="!used" type="button" class="danger-btn" @click="remove">
          <AppIcon name="trash" /> {{ t('Delete category') }}
        </button>
        <p v-else class="muted help">{{ t("Expenses use this category, so it can't be deleted. Hide it instead.") }}</p>
      </template>
    </form>
  </main>
</template>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; min-height: 48px; }
.title { font-size: 17px; font-weight: 800; }
.spacer { width: 44px; }
.fields { display: flex; flex-direction: column; gap: 16px; }
.preview { display: flex; align-items: center; gap: 12px; border-radius: 18px; padding: 14px 16px; }
.preview-name { font-size: 17px; font-weight: 800; color: var(--ink); }
.set { border: 0; margin: 0; padding: 0; }
.legend { padding: 0 0 6px; font-size: 13px; font-weight: 700; }
.swatches { display: flex; flex-wrap: wrap; gap: 8px; }
.swatch { height: 36px; padding: 0 12px; border: 2px solid transparent; border-radius: 99px; font-size: 13px; font-weight: 700; }
.icons { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
.icon-tile {
  aspect-ratio: 1; border: 1px solid var(--line); border-radius: 12px; background: var(--card);
  display: flex; align-items: center; justify-content: center; color: var(--muted);
}
.icon-tile--on { border: 2px solid var(--accent); color: var(--accent-ink); background: var(--accent-soft); }
.show-row { display: flex; align-items: center; gap: 12px; }
.show-text { flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.show-title { font-size: 14px; font-weight: 700; }
.show-hint, .help { font-size: 12px; font-weight: 500; line-height: 1.45; }
</style>
