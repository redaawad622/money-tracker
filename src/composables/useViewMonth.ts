import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addMonthsToKey, monthKeyOf, todayYmd } from '../lib/dates'

/** The month a screen is showing, kept in the URL (?month=YYYY-MM) so tabs share it. */
export function useViewMonth() {
  const route = useRoute()
  const router = useRouter()
  const currentMonth = monthKeyOf(todayYmd())

  const month = computed(() => {
    const q = route.query.month
    return typeof q === 'string' && /^\d{4}-\d{2}$/.test(q) ? q : currentMonth
  })
  const isCurrentMonth = computed(() => month.value === currentMonth)

  function shift(n: number) {
    const next = addMonthsToKey(month.value, n)
    void router.replace({ query: { ...route.query, month: next === currentMonth ? undefined : next } })
  }

  return { month, isCurrentMonth, prev: () => shift(-1), next: () => shift(1) }
}
