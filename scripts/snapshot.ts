// Refreshes src/data from Basketball-Reference and PokeAPI. Run with `bun scripts/snapshot.ts`.
// stats.nba.com blocks non-browser clients, and Basketball-Reference has every advanced and
// defensive metric the matcher needs, so it's the source.
import type { Player, Pokemon, PokemonType } from '../src/core/types.ts'
import { currentTeams, seasonPlayers } from './bbref.ts'

const SEASON = 2026 // Basketball-Reference names a season by the year it ends: 2025-26

async function players(): Promise<Player[]> {
  return seasonPlayers(SEASON, await currentTeams(SEASON + 1))
}

const STAT_KEYS: Record<string, keyof Pokemon['stats']> = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'spAtk',
  'special-defense': 'spDef',
  speed: 'speed',
}

async function pokemon(): Promise<Pokemon[]> {
  const query = `{ pokemon(where: {id: {_lte: 493}}, order_by: {id: asc}) {
    id pokemonstats { base_stat stat { name } } pokemontypes { slot type { name } }
    pokemonspecy { generation_id pokemonspeciesnames(where: {language_id: {_eq: 9}}) { name genus } } } }`
  const res = await fetch('https://graphql.pokeapi.co/v1beta2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`PokeAPI: HTTP ${res.status}`)
  const { data } = (await res.json()) as { data: { pokemon: any[] } }
  return data.pokemon.map((p) => {
    const stats = {} as Pokemon['stats']
    for (const s of p.pokemonstats) stats[STAT_KEYS[s.stat.name]] = s.base_stat
    const [names] = p.pokemonspecy.pokemonspeciesnames
    return {
      id: p.id,
      name: names.name,
      genus: names.genus,
      gen: p.pokemonspecy.generation_id,
      types: [...p.pokemontypes].sort((a, b) => a.slot - b.slot).map((t) => t.type.name as PokemonType),
      stats,
    }
  })
}

const [nba, dex] = await Promise.all([players(), pokemon()])
if (nba.length < 400) throw new Error(`Only ${nba.length} players parsed; the page layout may have changed`)
if (dex.length !== 493) throw new Error(`Expected 493 Pokémon, got ${dex.length}`)
const season = `${SEASON - 1}-${String(SEASON).slice(2)}`
await Bun.write('src/data/players.json', JSON.stringify({ season, fetched: new Date().toISOString().slice(0, 10), players: nba }))
await Bun.write('src/data/pokemon.json', JSON.stringify(dex))
console.log(`${nba.length} players (${season}), ${dex.length} Pokémon`)
