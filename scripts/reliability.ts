// Fits the matcher's weights from how steady each measure is from one season to the next, and
// backtests them before they're used. Run with `bun scripts/reliability.ts`; add --write to save
// src/data/weights.json, which it only does if the weights beat equal weighting out of sample.
import { tmpdir } from 'node:os'
import { rank } from '../src/core/match.ts'
import { AXES, GROUPS, groupOf, MIN_MINUTES, playerProfiles, pokemonProfiles, type Weights } from '../src/core/profile.ts'
import { STATS, type Group, type Player, type Pokemon, type Profile, type Stat } from '../src/core/types.ts'
import dex from '../src/data/pokemon.json'
import { seasonPlayers } from './bbref.ts'

async function season(year: number): Promise<Player[]> {
  const cache = Bun.file(`${tmpdir()}/hoopdex-${year}.json`)
  if (await cache.exists()) return cache.json()
  const players = await seasonPlayers(year)
  await Bun.write(cache, JSON.stringify(players))
  return players
}

function pearson(x: number[], y: number[]): number {
  const mx = x.reduce((a, b) => a + b, 0) / x.length
  const my = y.reduce((a, b) => a + b, 0) / y.length
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < x.length; i++) {
    sxy += (x[i] - mx) * (y[i] - my)
    sxx += (x[i] - mx) ** 2
    syy += (y[i] - my) ** 2
  }
  return sxy / Math.sqrt(sxx * syy)
}

/** Players who qualified in both seasons at the same position group, grouped by it. */
function pairs(before: Player[], after: Player[]): Map<Group, [Player, Player][]> {
  const earlier = new Map(before.filter((p) => p.minutes >= MIN_MINUTES).map((p) => [p.id, p]))
  const out = new Map<Group, [Player, Player][]>()
  for (const p of after) {
    const q = earlier.get(p.id)
    if (!q || p.minutes < MIN_MINUTES || !GROUPS[groupOf(p)].includes(q.pos)) continue
    out.set(groupOf(p), [...(out.get(groupOf(p)) ?? []), [q, p]])
  }
  return out
}

/** Correlation of a measure across the two seasons within each position, averaged by group size. */
function stability(groups: Map<Group, [Player, Player][]>, measure: (p: Player, later: boolean) => number): number {
  let total = 0, n = 0
  for (const list of groups.values()) {
    total += pearson(list.map(([a]) => measure(a, false)), list.map(([, b]) => measure(b, true))) * list.length
    n += list.length
  }
  return total / n
}

const round = (n: number) => Math.round(n * 1000) / 1000

function fit(before: Player[], after: Player[]): Weights {
  const groups = pairs(before, after)
  const metrics = Object.fromEntries(
    STATS.map((stat) => [stat, AXES[stat].metrics.map((m) => round(Math.max(0.05, stability(groups, (p) => m.value(p)))))]),
  ) as Weights['metrics']
  // Skill weights come from how steady each skill's composite is once its metrics are weighted
  const a = playerProfiles(before, { metrics, stats: {} as Record<Stat, number> })
  const b = playerProfiles(after, { metrics, stats: {} as Record<Stat, number> })
  const raw = Object.fromEntries(STATS.map((s) => [s, Math.max(0.05, stability(groups, (p, later) => (later ? b : a).get(p.id)![s]))])) as Record<Stat, number>
  const mean = STATS.reduce((sum, s) => sum + raw[s], 0) / STATS.length
  return { metrics, stats: Object.fromEntries(STATS.map((s) => [s, round(raw[s] / mean)])) as Record<Stat, number> }
}

const equal = (a: Profile, b: Profile) => Math.sqrt(STATS.reduce((sum, s) => sum + (a[s] - b[s]) ** 2, 0) / STATS.length)

/** How far each player's profile and match move between seasons. Lower drift and higher agreement are better. */
function evaluate(before: Player[], after: Player[], weights?: Weights) {
  const dexProfiles = pokemonProfiles(dex as Pokemon[])
  const a = playerProfiles(before, weights)
  const b = playerProfiles(after, weights)
  const ids = [...pairs(before, after).values()].flat().map(([, p]) => p.id)
  const drift = ids.map((id) => equal(a.get(id)!, b.get(id)!))
  let matchDrift = 0, kept = 0
  for (const id of ids) {
    const ra = rank(a.get(id)!, dex as Pokemon[], dexProfiles, weights?.stats)
    const rb = rank(b.get(id)!, dex as Pokemon[], dexProfiles, weights?.stats)
    matchDrift += equal(ra[0].profile, rb[0].profile)
    if (rb.slice(0, 10).some((c) => c.pokemon.id === ra[0].pokemon.id)) kept++
  }
  const mean = drift.reduce((x, y) => x + y, 0) / ids.length
  return { players: ids.length, drift: mean, matchDrift: matchDrift / ids.length, keptTop10: (100 * kept) / ids.length, perPlayer: drift }
}

/** Share of paired bootstrap resamples in which the weighted profiles drift less. */
function bootstrap(base: number[], weighted: number[], rounds = 2000): number {
  let wins = 0
  for (let i = 0; i < rounds; i++) {
    let diff = 0
    for (let j = 0; j < base.length; j++) {
      const k = Math.floor(Math.random() * base.length)
      diff += base[k] - weighted[k]
    }
    if (diff > 0) wins++
  }
  return (100 * wins) / rounds
}

const show = (label: string, r: ReturnType<typeof evaluate>) =>
  console.log(`  ${label.padEnd(16)} profile drift ${r.drift.toFixed(2)}  match drift ${r.matchDrift.toFixed(2)}  match kept in top 10 ${r.keptTop10.toFixed(1)}%  (${r.players} players)`)

const [s24, s25, s26] = await Promise.all([season(2024), season(2025), season(2026)])

// Fit on one pair of seasons, judge on the other, both ways round, so neither result has seen its own test
let passed = true
for (const [label, train, test] of [
  ['fit 2023-25, test 2024-26', [s24, s25], [s25, s26]],
  ['fit 2024-26, test 2023-25', [s25, s26], [s24, s25]],
] as const) {
  const weights = fit(train[0], train[1])
  const base = evaluate(test[0], test[1])
  const weighted = evaluate(test[0], test[1], weights)
  console.log(label)
  show('equal weights', base)
  show('fitted weights', weighted)
  console.log(`  steadier in ${bootstrap(base.perPlayer, weighted.perPlayer).toFixed(1)}% of bootstrap resamples`)
  passed &&= weighted.drift < base.drift && weighted.matchDrift < base.matchDrift && weighted.keptTop10 >= base.keptTop10
}
console.log(passed ? 'Fitted weights beat equal weighting both ways.' : 'Fitted weights did not beat equal weighting both ways; not saving.')

// The app uses weights fitted on the two most recent seasons
const final = fit(s25, s26)
if (process.argv.includes('--write') && passed) {
  await Bun.write('src/data/weights.json', JSON.stringify(final, null, 2) + '\n')
  console.log('Wrote src/data/weights.json')
}
