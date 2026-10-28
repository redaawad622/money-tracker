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
    { path: '/goals', name: 'goals', component: () => import('./views/GoalsView.vue') },
    { path: '/goals/new', name: 'new-goal', component: () => import('./views/GoalFormView.vue') },
    { path: '/goals/:id', name: 'goal', component: () => import('./views/GoalView.vue') },
    { path: '/goals/:id/edit', name: 'edit-goal', component: () => import('./views/GoalFormView.vue') },
    { path: '/accounts', name: 'accounts', component: () => import('./views/AccountsView.vue') },
    { path: '/accounts/new', name: 'new-account', component: () => import('./views/AccountFormView.vue') },
    { path: '/accounts/:id', name: 'account', component: () => import('./views/AccountView.vue') },
    { path: '/accounts/:id/edit', name: 'edit-account', component: () => import('./views/AccountFormView.vue') },
    { path: '/transfer', name: 'new-transfer', component: () => import('./views/TransferFormView.vue') },
    { path: '/transfer/:id', name: 'edit-transfer', component: () => import('./views/TransferFormView.vue') },
    { path: '/categories', name: 'categories', component: () => import('./views/CategoriesView.vue') },
    { path: '/categories/new', name: 'new-category', component: () => import('./views/CategoryFormView.vue') },
    { path: '/categories/:id', name: 'edit-category', component: () => import('./views/CategoryFormView.vue') },
    { path: '/settings', name: 'settings', component: () => import('./views/SettingsView.vue'), meta: { tabs: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
