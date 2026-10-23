export const CURRENCIES = ['$', '€', '£', 'SAR', 'AED', 'EGP'] as const
export type Currency = (typeof CURRENCIES)[number]

export function formatMoney(amount: number, currency: string): string {
  const num = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency.length > 1 ? `${currency} ${num}` : `${currency}${num}`
}

/** Round to cents to avoid floating point drift when summing. */
export function sumMoney(values: number[]): number {
  return Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100
}
