// Refreshes src/data from Basketball-Reference and PokeAPI. Run with `bun scripts/snapshot.ts`.
// stats.nba.com blocks non-browser clients, and Basketball-Reference has every advanced and
// defensive metric the matcher needs, so it's the source. Its rate limit is 20 requests a
// minute; this makes four, a few seconds apart.
import type { Player, Pokemon, PokemonType } from '../src/core/types.ts'

const SEASON = 2026 // Basketball-Reference names a season by the year it ends: 2025-26
const CURRENT = SEASON + 1
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'

type Row = Record<string, string>

async function table(page: string): Promise<Row[]> {
  const res = await fetch(`https://www.basketball-reference.com/leagues/${page}.html`, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${page}: HTTP ${res.status}`)
  const html = await res.text()
  const body = html.slice(html.indexOf('<tbody'), html.indexOf('</tbody>'))
  const rows: Row[] = []
  for (const [, tr] of body.matchAll(/<tr[^>]*>(.*?)<\/tr>/gs)) {
    const id = tr.match(/data-append-csv="([^"]+)"/)?.[1]
    if (!id) continue
    const row: Row = { id }
    for (const [, stat, value] of tr.matchAll(/data-stat="([^"]+)"[^>]*>(?:<[^>]+>)*([^<]*)/g)) row[stat] = value.trim()
    rows.push(row)
  }
  await Bun.sleep(4000)
  return rows
}

// Traded players get a combined row ("2TM") first, then one row per team in order
function byPlayer(rows: Row[]) {
  const totals = new Map<string, Row>()
  const lastTeam = new Map<string, string>()
  for (const row of rows) {
    if (!totals.has(row.id)) totals.set(row.id, row)
    if (!/^\dTM$/.test(row.team_name_abbr)) lastTeam.set(row.id, row.team_name_abbr)
  }
  return { totals, lastTeam }
}

const num = (value: string | undefined) => (value === undefined || value === '' ? null : Number(value))

async function players(): Promise<Player[]> {
  const advanced = byPlayer(await table(`NBA_${SEASON}_advanced`))
  const perPoss = byPlayer(await table(`NBA_${SEASON}_per_poss`))
  const perGame = byPlayer(await table(`NBA_${SEASON}_per_game`))
  const current = byPlayer(await table(`NBA_${CURRENT}_per_game`))
  const out: Player[] = []
  for (const [id, a] of advanced.totals) {
    const p = perPoss.totals.get(id)
    const g = perGame.totals.get(id)
    if (!p || !g || !a.pos) continue
    out.push({
      id,
      name: a.name_display,
      team: current.lastTeam.get(id) ?? advanced.lastTeam.get(id) ?? '',
      pos: a.pos as Player['pos'],
      age: Number(a.age),
      games: Number(a.games),
      minutes: Number(a.mp),
      ppg: num(g.pts_per_g) ?? 0,
      rpg: num(g.trb_per_g) ?? 0,
      apg: num(g.ast_per_g) ?? 0,
      ptsPer100: num(p.pts_per_poss) ?? 0,
      usg: num(a.usg_pct) ?? 0,
      ts: num(a.ts_pct) ?? 0,
      threesPer100: num(p.fg3_per_poss) ?? 0,
      astPct: num(a.ast_pct) ?? 0,
      tovPct: num(a.tov_pct) ?? 0,
      orbPct: num(a.orb_pct) ?? 0,
      drbPct: num(a.drb_pct) ?? 0,
      stlPct: num(a.stl_pct) ?? 0,
      blkPct: num(a.blk_pct) ?? 0,
      dws: num(a.dws) ?? 0,
      dbpm: num(a.dbpm) ?? 0,
      drtg: num(p.def_rtg),
    })
  }
  return out
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
