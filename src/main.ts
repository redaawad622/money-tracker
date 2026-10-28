import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/manrope/800.css'
import './assets/main.css'
import App from './App.vue'
import { router } from './router'
import { useAccount } from './composables/useAccount'
import { useAppLock } from './composables/useAppLock'
import { useBillReminders } from './composables/useBillReminders'
import { useIncomeLock } from './composables/useIncomeLock'
import { useCategoriesStore } from './stores/categories'
import { useExpensesStore } from './stores/expenses'
import { useIncomeStore } from './stores/income'
import { useRewardsStore } from './stores/rewards'
import { useSettingsStore } from './stores/settings'
import { useSubscriptionsStore } from './stores/subscriptions'

async function start() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  // Saved data must be loaded before anything can change (and save) the stores.
  await Promise.all([
    useSettingsStore(pinia).hydrate(),
    useExpensesStore(pinia).hydrate(),
    useSubscriptionsStore(pinia).hydrate(),
    useIncomeStore(pinia).hydrate(),
    useRewardsStore(pinia).hydrate(),
    useCategoriesStore(pinia).hydrate(),
    useAppLock().start(),
    useIncomeLock().start(),
  ])
  app.use(router)
  app.mount('#app')
  void useAccount().start()
  void useBillReminders().start((path) => void router.push(path))
}

void start()
