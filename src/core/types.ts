export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C'
export type Group = 'guards' | 'forwards' | 'centers'

// One player's season line from Basketball-Reference. Rates are per 100 possessions or
// percentages of available opportunities, so bench players compare fairly with starters.
export type Player = {
  id: string
  name: string
  team: string
  pos: Position
  age: number
  games: number
  minutes: number
  ppg: number
  rpg: number
  apg: number
  ptsPer100: number
  usg: number
  ts: number
  threesPer100: number
  astPct: number
  tovPct: number
  orbPct: number
  drbPct: number
  stlPct: number
  blkPct: number
  dws: number
  dbpm: number
  drtg: number | null
}

export type PokemonType =
  | 'normal' | 'fire' | 'water' | 'electric' | 'grass' | 'ice' | 'fighting' | 'poison' | 'ground'
  | 'flying' | 'psychic' | 'bug' | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy'

export type Pokemon = {
  id: number
  name: string
  genus: string
  gen: number
  types: PokemonType[]
  stats: Record<Stat, number>
}

export const STATS = ['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'] as const
export type Stat = (typeof STATS)[number]

// Percentile ranks, 0-100, for each Pokémon stat
export type Profile = Record<Stat, number>

/** One player's line from a real box score */
export type BoxLine = {
  id: string
  name: string
  minutes: number
  pts: number
  trb: number
  ast: number
  gameScore: number
}

export type GameSide = {
  team: string
  pts: number
  periods: number[]
  box: BoxLine[]
}

/** A real game this season, from its Basketball-Reference box score */
export type Game = {
  id: string
  date: string
  home: GameSide
  away: GameSide
  overtimes: string
  arena: string
}
