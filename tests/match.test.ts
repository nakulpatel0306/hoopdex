import { describe, expect, test } from 'bun:test'
import { buildLeague } from '../src/core/league.ts'
import { closestAndFurthest, distance } from '../src/core/match.ts'
import { composite, percentiles } from '../src/core/percentile.ts'
import { AXES, MIN_MINUTES, playerProfiles, pokemonProfiles, type Weights } from '../src/core/profile.ts'
import { STATS, type Player, type Pokemon } from '../src/core/types.ts'
import players from '../src/data/players.json'
import dex from '../src/data/pokemon.json'
import fitted from '../src/data/weights.json'

const weights = fitted as Weights
const league = buildLeague(players as { season: string; fetched: string; players: Player[] }, dex as Pokemon[], weights)
const dexProfiles = pokemonProfiles(dex as Pokemon[])

describe('percentiles', () => {
  test('spread evenly and share the middle on ties', () => {
    expect(percentiles([10, 20, 30, 40])).toEqual([12.5, 37.5, 62.5, 87.5])
    expect(percentiles([5, 5, 5])).toEqual([50, 50, 50])
  })

  test('a weighted composite leans toward the heavier metric', () => {
    // Metric A ranks them 1-2-3-4, metric B the reverse; tripling A's weight keeps A's order
    expect(composite([[1, 2, 3, 4], [4, 3, 2, 1]], [3, 1])).toEqual([12.5, 37.5, 62.5, 87.5])
  })

  test('a composite averages each metric rank, then ranks the average', () => {
    expect(composite([[1, 2, 3, 4]])).toEqual(percentiles([1, 2, 3, 4]))
    // The middle two split the metrics, so they tie between the clear best and worst
    expect(composite([
      [1, 2, 3, 4],
      [10, 30, 20, 40],
    ])).toEqual([12.5, 50, 50, 87.5])
  })
})

describe('player profiles', () => {
  test('rank each player only against their own position group', () => {
    const forward = (id: string, dbpm: number): Player => ({
      id, name: id, team: 'BOS', pos: 'SF', age: 25, games: 70, minutes: 2000, ppg: 10, rpg: 5, apg: 2,
      ptsPer100: 20, usg: 20, ts: 0.57, threesPer100: 3, astPct: 12, tovPct: 11, orbPct: 4, drbPct: 14,
      stlPct: 1.5, blkPct: 1.5, dws: 2, dbpm, drtg: 112,
    })
    // A center with elite defense must not push the forwards down
    const center = { ...forward('c', 9), pos: 'C' as const }
    const profiles = playerProfiles([forward('a', -1), forward('b', 2), center])
    expect(profiles.get('b')!.defense).toBeGreaterThan(profiles.get('a')!.defense)
    expect(profiles.get('c')!.defense).toBe(50)
  })

  test('leave out players under the minutes cutoff', () => {
    for (const e of league.entries) expect(e.profile === null).toBe(e.player.minutes < MIN_MINUTES)
  })
})

describe('matching', () => {
  test('every best match is the closest Pokémon in the whole Pokédex on all six weighted stats', () => {
    for (const e of league.entries) {
      if (!e.profile) continue
      const best = Math.min(...(dex as Pokemon[]).map((p) => distance(e.profile!, dexProfiles.get(p.id)!, weights.stats)))
      expect(e.matches[0].distance).toBe(best)
    }
  })

  test('unweighted, a gap on Defense costs the same as a gap on Speed', () => {
    const base = { hp: 50, attack: 50, defense: 50, spAtk: 50, spDef: 50, speed: 50 }
    expect(distance(base, { ...base, defense: 80 })).toBe(distance(base, { ...base, speed: 80 }))
  })

  test('a heavier stat costs more for the same gap, and every stat still counts', () => {
    const base = { hp: 50, attack: 50, defense: 50, spAtk: 50, spDef: 50, speed: 50 }
    const w = { hp: 0.5, attack: 1.5, defense: 1, spAtk: 1, spDef: 1, speed: 1 }
    expect(distance(base, { ...base, attack: 80 }, w)).toBeGreaterThan(distance(base, { ...base, hp: 80 }, w))
    expect(distance(base, { ...base, hp: 80 }, w)).toBeGreaterThan(0)
  })

  test('the fitted weights cover every metric and stat, all positive', () => {
    for (const s of STATS) {
      expect(weights.metrics[s]).toHaveLength(AXES[s].metrics.length)
      for (const r of weights.metrics[s]) expect(r).toBeGreaterThan(0)
      expect(weights.stats[s]).toBeGreaterThan(0)
    }
  })

  test('one big miss costs more than the same total spread evenly', () => {
    const base = { hp: 50, attack: 50, defense: 50, spAtk: 50, spDef: 50, speed: 50 }
    const lopsided = { ...base, speed: 86 }
    const even = { hp: 56, attack: 56, defense: 56, spAtk: 56, spDef: 56, speed: 56 }
    expect(distance(base, lopsided)).toBeGreaterThan(distance(base, even))
  })

  test('the summary names the stats with the smallest and largest gaps', () => {
    const a = { hp: 50, attack: 50, defense: 50, spAtk: 50, spDef: 50, speed: 50 }
    const b = { hp: 51, attack: 60, defense: 52, spAtk: 70, spDef: 90, speed: 65 }
    expect(closestAndFurthest(a, b)).toEqual({ closest: ['hp', 'defense'], furthest: 'spDef' })
  })

  test('candidates are sorted closest first and the fit score follows the distance', () => {
    const e = league.entries.find((x) => x.profile)!
    const fits = e.matches.map((m) => m.fit)
    expect(fits).toEqual([...fits].sort((a, b) => b - a))
    expect(e.matches[0].fit).toBe(Math.round(100 - e.matches[0].distance))
  })

  test('the snapshot covers all 493 gen 1-4 Pokémon and a full league of players', () => {
    expect(dex).toHaveLength(493)
    expect(Math.max(...(dex as Pokemon[]).map((p) => p.gen))).toBe(4)
    expect(league.entries.filter((e) => e.profile).length).toBeGreaterThan(300)
  })
})
