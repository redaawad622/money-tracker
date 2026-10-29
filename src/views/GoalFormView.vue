<script setup lang="ts">
import { t } from '../i18n'
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { todayYmd } from '../lib/dates'
import { useGoalsStore } from '../stores/goals'
import { useSettingsStore } from '../stores/settings'

const route = useRoute()
const router = useRouter()
const goals = useGoalsStore()
const { settings } = useSettingsStore()

const editing = typeof route.params.id === 'string' ? goals.get(route.params.id) : undefined
const name = shallowRef(editing?.name ?? '')
const target = shallowRef<number | ''>(editing?.target ?? '')
const targetDate = shallowRef(editing?.targetDate ?? '')
const back = editing ? `/goals/${editing.id}` : '/goals'

const canSave = computed(() => name.value.trim() !== '' && typeof target.value === 'number' && target.value > 0)

function save() {
  if (!canSave.value || typeof target.value !== 'number') return
  const input = { name: name.value.trim(), target: Math.round(target.value * 100) / 100, targetDate: targetDate.value || undefined }
  if (editing) {
    goals.update(editing.id, input)
    void router.replace(back)
  } else {
    void router.replace(`/goals/${goals.add(input).id}`)
  }
}

function remove() {
  if (!editing || !window.confirm(t('Delete "{name}" and its history? The money itself stays wherever you keep it.', { name: editing.name }))) return
  goals.remove(editing.id)
  void router.replace('/goals')
}
</script>

<template>
  <main class="page page--no-tabs">
    <header class="header">
      <RouterLink :to="back" class="icon-btn" :aria-label="t('Close')"><AppIcon name="close" /></RouterLink>
      <h1 class="title">{{ editing ? t('Edit goal') : t('New goal') }}</h1>
      <div class="spacer" />
    </header>

    <form class="fields" @submit.prevent="save">
      <label class="field">
        {{ t('Name') }}
        <input v-model="name" type="text" :placeholder="t('e.g. New car, Eid, Emergency fund')" maxlength="40" required />
      </label>
      <label class="field">
        {{ t('Target ({currency})', { currency: settings.currency }) }}
        <input v-model.number="target" type="number" inputmode="decimal" min="0" step="1" placeholder="0" required />
      </label>
      <label class="field">
        {{ t('Reach it by (optional)') }}
        <input v-model="targetDate" type="date" :min="todayYmd()" />
      </label>
      <p class="muted help">{{ t('With a date, the goal shows how much to put aside each month to get there on time.') }}</p>

      <button type="submit" class="primary-btn" :disabled="!canSave">
        <AppIcon name="check" :stroke-width="2.4" /> {{ t('Save') }}
      </button>
      <button v-if="editing" type="button" class="danger-btn" @click="remove">
        <AppIcon name="trash" /> {{ t('Delete goal') }}
      </button>
    </form>
  </main>
</template>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; min-height: 48px; }
.title { font-size: 17px; font-weight: 800; }
.spacer { width: 44px; }
.fields { display: flex; flex-direction: column; gap: 16px; }
.help { font-size: 13px; font-weight: 500; margin-top: -8px; line-height: 1.45; }
</style>
