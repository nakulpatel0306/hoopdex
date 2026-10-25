import type { Group, Stat } from '../core/types'

export const STAT_NAMES: Record<Stat, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  spAtk: 'Sp. Atk',
  spDef: 'Sp. Def',
  speed: 'Speed',
}

export const GROUP_NAMES: Record<Group, string> = { guards: 'guards', forwards: 'forwards', centers: 'centers' }

export function ordinal(pct: number): string {
  const n = Math.min(99, Math.max(1, Math.round(pct)))
  const tens = n % 100
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return `${n}${suffix}`
}

// Accents and case shouldn't stop "jokic" finding Jokić
export const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
