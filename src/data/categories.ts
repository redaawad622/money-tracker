import type { IconName } from './icons'

export type CategoryGroup = 'daily' | 'monthly'
export type Family = 'food' | 'car' | 'home' | 'family' | 'health' | 'bills' | 'other'

export interface Category {
  id: string
  name: string
  group: CategoryGroup
  family: Family
  icon: IconName
}

export const FAMILY_COLORS: Record<Family, { ink: string; tint: string; bar: string }> = {
  food: { ink: '#9A4A0B', tint: '#FBEBDC', bar: '#E08A3C' },
  car: { ink: '#2448AB', tint: '#E2E9FB', bar: '#2F5BD3' },
  home: { ink: '#1A5E47', tint: '#DCEBE3', bar: '#1F6F54' },
  family: { ink: '#9B2C5E', tint: '#F8E3EC', bar: '#C2457D' },
  health: { ink: '#A12B2B', tint: '#F9E3E1', bar: '#C94A4A' },
  bills: { ink: '#5A3FA8', tint: '#ECE6FA', bar: '#7357C7' },
  other: { ink: '#4A544F', tint: '#EEF0EB', bar: '#7C857F' },
}

export const CATEGORIES: Category[] = [
  { id: 'breakfast', name: 'Breakfast', group: 'daily', family: 'food', icon: 'breakfast' },
  { id: 'lunch', name: 'Lunch', group: 'daily', family: 'food', icon: 'lunch' },
  { id: 'dinner', name: 'Dinner', group: 'daily', family: 'food', icon: 'dinner' },
  { id: 'coffee', name: 'Coffee', group: 'daily', family: 'food', icon: 'coffee' },
  { id: 'groceries', name: 'Groceries', group: 'daily', family: 'home', icon: 'groceries' },
  { id: 'home-needs', name: 'Home needs', group: 'daily', family: 'home', icon: 'home' },
  { id: 'wife', name: 'Wife', group: 'daily', family: 'family', icon: 'wife' },
  { id: 'children', name: 'Children', group: 'daily', family: 'family', icon: 'kids' },
  { id: 'gas', name: 'Gas', group: 'daily', family: 'car', icon: 'gas' },
  { id: 'car', name: 'Car', group: 'daily', family: 'car', icon: 'car' },
  { id: 'taxi', name: 'Taxi & bus', group: 'daily', family: 'car', icon: 'taxi' },
  { id: 'health', name: 'Health', group: 'daily', family: 'health', icon: 'health' },
  { id: 'shopping', name: 'Shopping', group: 'daily', family: 'family', icon: 'shopping' },
  { id: 'other-daily', name: 'Other', group: 'daily', family: 'other', icon: 'other' },
  { id: 'mobile-bill', name: 'Mobile bill', group: 'monthly', family: 'bills', icon: 'mobile' },
  { id: 'internet-bill', name: 'Internet bill', group: 'monthly', family: 'bills', icon: 'internet' },
  { id: 'electricity-bill', name: 'Electricity', group: 'monthly', family: 'bills', icon: 'power' },
  { id: 'water-bill', name: 'Water bill', group: 'monthly', family: 'bills', icon: 'water' },
  { id: 'home-gas-bill', name: 'Home gas', group: 'monthly', family: 'bills', icon: 'flame' },
  { id: 'rent', name: 'Rent', group: 'monthly', family: 'home', icon: 'rent' },
  { id: 'school-fees', name: 'School fees', group: 'monthly', family: 'family', icon: 'school' },
  { id: 'car-payment', name: 'Car payment', group: 'monthly', family: 'car', icon: 'car' },
  { id: 'card-loan', name: 'Card / loan', group: 'monthly', family: 'bills', icon: 'card' },
  { id: 'other-monthly', name: 'Other', group: 'monthly', family: 'other', icon: 'other' },
]

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]))
const FALLBACK = BY_ID.get('other-daily')!

export function categoryById(id: string): Category {
  return BY_ID.get(id) ?? FALLBACK
}
