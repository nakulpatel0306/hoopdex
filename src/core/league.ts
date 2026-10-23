import { rank, type Candidate } from './match.ts'
import { groupOf, playerProfiles, pokemonProfiles, type Weights } from './profile.ts'
import type { Group, Player, Pokemon, Profile } from './types.ts'

export type Entry = {
  player: Player
  group: Group
  // Null when the player is under the minutes cutoff
  profile: Profile | null
  matches: Candidate[]
}

export type League = {
  season: string
  fetched: string
  entries: Entry[]
  byId: Map<string, Entry>
  dex: Pokemon[]
  dexProfiles: Map<number, Profile>
  // Which players each Pokémon is the top match for
  trainers: Map<number, Entry[]>
}

export function buildLeague(data: { season: string; fetched: string; players: Player[] }, dex: Pokemon[], weights?: Weights): League {
  const profiles = playerProfiles(data.players, weights)
  const dexProfiles = pokemonProfiles(dex)
  const entries = data.players
    .map((player) => {
      const profile = profiles.get(player.id) ?? null
      return { player, group: groupOf(player), profile, matches: profile ? rank(profile, dex, dexProfiles, weights?.stats) : [] }
    })
    .sort((a, b) => b.player.minutes - a.player.minutes)
  const trainers = new Map<number, Entry[]>()
  for (const e of entries) {
    const top = e.matches[0]
    if (top) trainers.set(top.pokemon.id, [...(trainers.get(top.pokemon.id) ?? []), e])
  }
  return {
    season: data.season,
    fetched: data.fetched,
    entries,
    byId: new Map(entries.map((e) => [e.player.id, e])),
    dex,
    dexProfiles,
    trainers,
  }
}
