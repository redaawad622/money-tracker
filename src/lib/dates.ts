// All dates are local calendar dates stored as "YYYY-MM-DD" strings.
// Never derive them from toISOString(): that is UTC and shifts the day near midnight.

const pad = (n: number) => String(n).padStart(2, '0')

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayYmd(now: Date = new Date()): string {
  return toYmd(now)
}

/** "YYYY-MM" */
export function monthKeyOf(ymd: string): string {
  return ymd.slice(0, 7)
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate()
}

export function splitMonthKey(key: string): { year: number; month: number } {
  const [year, month] = key.split('-').map(Number)
  return { year, month }
}

export function addMonthsToKey(key: string, n: number): string {
  const { year, month } = splitMonthKey(key)
  const d = new Date(year, month - 1 + n, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

/** Shift a date by whole months, clamping to the last day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const first = new Date(y, m - 1 + n, 1)
  const day = Math.min(d, daysInMonth(first.getFullYear(), first.getMonth() + 1))
  return `${first.getFullYear()}-${pad(first.getMonth() + 1)}-${pad(day)}`
}

export function daysBetween(fromYmd: string, toYmdStr: string): number {
  return Math.round((parseYmd(toYmdStr).getTime() - parseYmd(fromYmd).getTime()) / 86_400_000)
}

export function monthDates(key: string): string[] {
  const { year, month } = splitMonthKey(key)
  return Array.from({ length: daysInMonth(year, month) }, (_, i) => `${key}-${pad(i + 1)}`)
}

export function formatMonth(key: string): string {
  const { year, month } = splitMonthKey(key)
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export function formatShortMonth(key: string): string {
  const { year, month } = splitMonthKey(key)
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'short' })
}

export function formatDay(ymd: string): string {
  return parseYmd(ymd).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatDayMonth(ymd: string): string {
  return parseYmd(ymd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function weekdayShort(ymd: string): string {
  return parseYmd(ymd).toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()
}

/** 0 = Monday … 6 = Sunday */
export function mondayIndex(ymd: string): number {
  return (parseYmd(ymd).getDay() + 6) % 7
}
