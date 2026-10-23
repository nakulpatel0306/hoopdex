import { composite, percentiles } from './percentile.ts'
import { STATS, type Group, type Player, type Pokemon, type Profile, type Stat } from './types.ts'

// Below this, a few hot or cold nights swing every rate stat
export const MIN_MINUTES = 500

export const GROUPS: Record<Group, Player['pos'][]> = {
  guards: ['PG', 'SG'],
  forwards: ['SF', 'PF'],
  centers: ['C'],
}

const signed = (n: number) => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1))

export const groupOf = (player: Player): Group =>
  player.pos === 'C' ? 'centers' : player.pos === 'SF' || player.pos === 'PF' ? 'forwards' : 'guards'

// Which basketball skill stands in for each Pokémon stat, and the metrics that measure it.
// Lower-is-better metrics are negated so a higher value always means better.
export const AXES: Record<Stat, { skill: string; metrics: { label: string; value: (p: Player) => number; display: (p: Player) => string }[] }> = {
  hp: {
    skill: 'Durability',
    metrics: [{ label: 'Minutes played', value: (p) => p.minutes, display: (p) => `${p.minutes.toLocaleString('en-US')} min` }],
  },
  attack: {
    skill: 'Scoring',
    metrics: [
      { label: 'Points per 100 possessions', value: (p) => p.ptsPer100, display: (p) => p.ptsPer100.toFixed(1) },
      { label: 'Usage rate', value: (p) => p.usg, display: (p) => `${p.usg.toFixed(1)}%` },
    ],
  },
  defense: {
    skill: 'Defense',
    metrics: [
      { label: 'Defensive box plus/minus', value: (p) => p.dbpm, display: (p) => signed(p.dbpm) },
      { label: 'Defensive win shares per 48', value: (p) => (48 * p.dws) / p.minutes, display: (p) => ((48 * p.dws) / p.minutes).toFixed(3).replace(/^0/, '') },
      { label: 'Defensive rating (lower is better)', value: (p) => -(p.drtg ?? 115), display: (p) => String(p.drtg ?? '–') },
      { label: 'Block rate', value: (p) => p.blkPct, display: (p) => `${p.blkPct.toFixed(1)}%` },
      { label: 'Steal rate', value: (p) => p.stlPct, display: (p) => `${p.stlPct.toFixed(1)}%` },
    ],
  },
  spAtk: {
    skill: 'Shooting',
    metrics: [
      { label: 'True shooting', value: (p) => p.ts, display: (p) => `${(p.ts * 100).toFixed(1)}%` },
      { label: 'Threes per 100 possessions', value: (p) => p.threesPer100, display: (p) => p.threesPer100.toFixed(1) },
    ],
  },
  spDef: {
    skill: 'Rebounding',
    metrics: [
      { label: 'Defensive rebound rate', value: (p) => p.drbPct, display: (p) => `${p.drbPct.toFixed(1)}%` },
      { label: 'Offensive rebound rate', value: (p) => p.orbPct, display: (p) => `${p.orbPct.toFixed(1)}%` },
    ],
  },
  speed: {
    skill: 'Playmaking',
    metrics: [
      { label: 'Assist rate', value: (p) => p.astPct, display: (p) => `${p.astPct.toFixed(1)}%` },
      { label: 'Turnover rate (lower is better)', value: (p) => -p.tovPct, display: (p) => `${p.tovPct.toFixed(1)}%` },
    ],
  },
}

/**
 * Fitted by scripts/reliability.ts from how steady each measure is from one season to the next.
 * `metrics` weights each metric inside its skill (same order as AXES); `stats` weights each skill
 * in the match. Steadier measures say more about the player and less about one season's luck.
 */
export type Weights = {
  metrics: Record<Stat, number[]>
  stats: Record<Stat, number>
}

export const qualified = (players: Player[], group: Group) =>
  players.filter((p) => GROUPS[group].includes(p.pos) && p.minutes >= MIN_MINUTES)

// Ranks each qualified player against their own position group, so a forward's
// 67th-percentile defense means better than two thirds of forwards, not of everyone
export function playerProfiles(players: Player[], weights?: Weights): Map<string, Profile> {
  const out = new Map<string, Profile>()
  for (const name of Object.keys(GROUPS) as Group[]) {
    const group = qualified(players, name)
    if (group.length === 0) continue
    const ranks = Object.fromEntries(
      STATS.map((stat) => [stat, composite(AXES[stat].metrics.map((m) => group.map(m.value)), weights?.metrics[stat])]),
    ) as Record<Stat, number[]>
    group.forEach((p, i) => out.set(p.id, Object.fromEntries(STATS.map((s) => [s, ranks[s][i]])) as Profile))
  }
  return out
}

export function pokemonProfiles(dex: Pokemon[]): Map<number, Profile> {
  const ranks = Object.fromEntries(STATS.map((s) => [s, percentiles(dex.map((p) => p.stats[s]))])) as Record<Stat, number[]>
  return new Map(dex.map((p, i) => [p.id, Object.fromEntries(STATS.map((s) => [s, ranks[s][i]])) as Profile]))
}
