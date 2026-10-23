import { STATS, type Pokemon, type Profile, type Stat } from './types.ts'

export type Candidate = { pokemon: Pokemon; profile: Profile; distance: number; fit: number }

// Root-mean-square gap across all six stats, in percentile points. Every stat counts the
// same, so a Pokémon has to resemble the whole player, not just their best skill.
export const distance = (a: Profile, b: Profile) => Math.sqrt(STATS.reduce((sum, s) => sum + (a[s] - b[s]) ** 2, 0) / STATS.length)

export function rank(player: Profile, dex: Pokemon[], profiles: Map<number, Profile>): Candidate[] {
  return dex
    .map((pokemon) => {
      const profile = profiles.get(pokemon.id)!
      const d = distance(player, profile)
      return { pokemon, profile, distance: d, fit: Math.round(100 - d) }
    })
    .sort((a, b) => a.distance - b.distance)
}

// The stats where the two line up best and worst, for the one-line summary on a match
export function closestAndFurthest(a: Profile, b: Profile): { closest: Stat[]; furthest: Stat } {
  const byGap = [...STATS].sort((x, y) => Math.abs(a[x] - b[x]) - Math.abs(a[y] - b[y]))
  return { closest: byGap.slice(0, 2), furthest: byGap[byGap.length - 1] }
}
