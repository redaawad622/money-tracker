import { daysBetween, monthKeyOf } from './dates'
import { sumMoney } from './money'

// Four kinds of income, all stored in one list:
// - salary: a fixed amount every month while it runs
// - investment: money put in at a yearly return percentage you choose (e.g. 25%), counted month by month
// - deal: a one-off investment with what it earned (profit) over its period, reported in the year it ends
// - project: your own business (cafe, restaurant…), with earnings and costs logged by date

export type IncomeType = 'salary' | 'investment' | 'deal' | 'project'

interface Base {
  id: string
  name: string
  note?: string
}

export interface Salary extends Base {
  type: 'salary'
  /** Paid every month. */
  amount: number
  /** First month it counts, YYYY-MM-DD. */
  start: string
  /** Last month it counts, or null while it continues. */
  end: string | null
}

export interface Investment extends Base {
  type: 'investment'
  principal: number
  /** Yearly return, in percent. */
  ratePercent: number
  start: string
  end: string | null
}

export interface Deal extends Base {
  type: 'deal'
  invested: number
  /** Profit the deal made on top of what was invested. */
  earned: number
  /** Set when the profit was entered as a percent of what was invested; `earned` is worked out from it. */
  earnedPercent?: number
  start: string
  end: string
}

export interface ProjectEntry {
  id: string
  date: string
  /** Earnings are positive, costs negative. */
  amount: number
  note: string
}

export interface Project extends Base {
  type: 'project'
  entries: ProjectEntry[]
}

export type IncomeSource = Salary | Investment | Deal | Project

/** Months of `year` (1–12) that fall between start and end (inclusive), by calendar month. */
export function activeMonths(start: string, end: string | null, year: number): number {
  let n = 0
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, '0')}`
    if (key >= monthKeyOf(start) && (end === null || key <= monthKeyOf(end))) n++
  }
  return n
}

export function isActiveInMonth(start: string, end: string | null, monthKey: string): boolean {
  return monthKey >= monthKeyOf(start) && (end === null || monthKey <= monthKeyOf(end))
}

export function investmentYearlyReturn(inv: Investment): number {
  return (inv.principal * inv.ratePercent) / 100
}

export function investmentMonthlyReturn(inv: Investment): number {
  return investmentYearlyReturn(inv) / 12
}

export function salaryForYear(s: Salary, year: number): number {
  return sumMoney([s.amount * activeMonths(s.start, s.end, year)])
}

export function investmentReturnForYear(inv: Investment, year: number): number {
  return sumMoney([investmentMonthlyReturn(inv) * activeMonths(inv.start, inv.end, year)])
}

/** A deal's profit as a percent of what was invested. */
export function dealReturnPercent(d: Deal): number {
  return d.invested > 0 ? (d.earned / d.invested) * 100 : 0
}

export function dealDays(d: Deal): number {
  return Math.max(daysBetween(d.start, d.end), 0)
}

/** The deal's return scaled to a 12-month period, so short and long deals compare. */
export function dealYearlyPercent(d: Deal): number | null {
  const days = dealDays(d)
  return days > 0 ? (dealReturnPercent(d) * 365) / days : null
}

export function formatPeriod(days: number): string {
  if (days < 45) return `${days} ${days === 1 ? 'day' : 'days'}`
  const months = Math.round(days / 30.44)
  if (months < 24) return `${months} months`
  const years = Math.round((months / 12) * 10) / 10
  return `${years} years`
}

/** Deals are counted in the year they end, when the earnings come in. */
export function dealsEndingIn(deals: Deal[], year: number): Deal[] {
  return deals.filter((d) => d.end.startsWith(`${year}-`)).sort((a, b) => a.end.localeCompare(b.end))
}

export interface DealReport {
  count: number
  invested: number
  earned: number
  /** Total earned as a percent of total invested. */
  returnPercent: number
  best: Deal | null
}

export function dealReport(deals: Deal[], year: number): DealReport {
  const list = dealsEndingIn(deals, year)
  const invested = sumMoney(list.map((d) => d.invested))
  const earned = sumMoney(list.map((d) => d.earned))
  let best: Deal | null = null
  for (const d of list) if (!best || dealReturnPercent(d) > dealReturnPercent(best)) best = d
  return { count: list.length, invested, earned, returnPercent: invested > 0 ? (earned / invested) * 100 : 0, best }
}

export function projectEntriesIn(p: Project, year: number): ProjectEntry[] {
  return p.entries.filter((e) => e.date.startsWith(`${year}-`))
}

export function projectTotals(p: Project, year: number) {
  const list = projectEntriesIn(p, year)
  const earnings = sumMoney(list.filter((e) => e.amount > 0).map((e) => e.amount))
  const costs = sumMoney(list.filter((e) => e.amount < 0).map((e) => -e.amount))
  return { earnings, costs, net: sumMoney([earnings, -costs]) }
}

export interface YearSummary {
  salary: number
  investments: number
  deals: number
  projects: number
  total: number
}

export function yearSummary(sources: IncomeSource[], year: number): YearSummary {
  const salary = sumMoney(sources.filter((s): s is Salary => s.type === 'salary').map((s) => salaryForYear(s, year)))
  const investments = sumMoney(sources.filter((s): s is Investment => s.type === 'investment').map((s) => investmentReturnForYear(s, year)))
  const deals = dealReport(sources.filter((s): s is Deal => s.type === 'deal'), year).earned
  const projects = sumMoney(sources.filter((s): s is Project => s.type === 'project').map((p) => projectTotals(p, year).net))
  return { salary, investments, deals, projects, total: sumMoney([salary, investments, deals, projects]) }
}

/** Salary plus investment returns that come in every month of monthKey. */
export function monthlyRecurring(sources: IncomeSource[], monthKey: string): number {
  const values: number[] = []
  for (const s of sources) {
    if (s.type === 'salary' && isActiveInMonth(s.start, s.end, monthKey)) values.push(s.amount)
    if (s.type === 'investment' && isActiveInMonth(s.start, s.end, monthKey)) values.push(investmentMonthlyReturn(s))
  }
  return sumMoney(values)
}

export interface MonthIncome {
  salary: number
  investments: number
  deals: number
  projects: number
  total: number
}

/** What came in during one month: salaries and investment returns running that month, deals ending in it, and project net. */
export function monthIncome(sources: IncomeSource[], monthKey: string): MonthIncome {
  const salary: number[] = []
  const investments: number[] = []
  const deals: number[] = []
  const projects: number[] = []
  for (const s of sources) {
    if (s.type === 'salary' && isActiveInMonth(s.start, s.end, monthKey)) salary.push(s.amount)
    if (s.type === 'investment' && isActiveInMonth(s.start, s.end, monthKey)) investments.push(investmentMonthlyReturn(s))
    if (s.type === 'deal' && monthKeyOf(s.end) === monthKey) deals.push(s.earned)
    if (s.type === 'project') for (const e of s.entries) if (monthKeyOf(e.date) === monthKey) projects.push(e.amount)
  }
  const out = { salary: sumMoney(salary), investments: sumMoney(investments), deals: sumMoney(deals), projects: sumMoney(projects) }
  return { ...out, total: sumMoney([out.salary, out.investments, out.deals, out.projects]) }
}
