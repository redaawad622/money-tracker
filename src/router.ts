import { createRouter, createWebHashHistory } from 'vue-router'
import OverviewView from './views/OverviewView.vue'

export const router = createRouter({
  // Hash history works the same in the browser and inside the Capacitor WebView.
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'overview', component: OverviewView, meta: { tabs: true } },
    { path: '/calendar', name: 'calendar', component: () => import('./views/CalendarView.vue'), meta: { tabs: true } },
    { path: '/day/:date', name: 'day', component: () => import('./views/DayView.vue') },
    { path: '/add', name: 'add', component: () => import('./views/ExpenseFormView.vue') },
    { path: '/expense/:id', name: 'edit-expense', component: () => import('./views/ExpenseFormView.vue') },
    { path: '/fixed', name: 'subscriptions', component: () => import('./views/SubscriptionsView.vue'), meta: { tabs: true } },
    { path: '/fixed/new', name: 'new-subscription', component: () => import('./views/SubscriptionFormView.vue') },
    { path: '/fixed/:id', name: 'edit-subscription', component: () => import('./views/SubscriptionFormView.vue') },
    { path: '/income', name: 'income', component: () => import('./views/IncomeView.vue'), meta: { tabs: true } },
    { path: '/income/new/:type', name: 'new-income', component: () => import('./views/IncomeFormView.vue') },
    { path: '/income/project/:id', name: 'project', component: () => import('./views/ProjectView.vue') },
    { path: '/income/:id', name: 'edit-income', component: () => import('./views/IncomeFormView.vue') },
    { path: '/rewards', name: 'rewards', component: () => import('./views/RewardsView.vue') },
    { path: '/settings', name: 'settings', component: () => import('./views/SettingsView.vue'), meta: { tabs: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
