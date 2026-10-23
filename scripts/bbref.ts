// Basketball-Reference parsing shared by the snapshot, reliability and games scripts.
// Its rate limit is 20 requests a minute, so every fetch waits a few seconds afterwards.
import type { Player } from '../src/core/types.ts'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'

export type Row = Record<string, string>

export async function page(path: string): Promise<string> {
  const res = await fetch(`https://www.basketball-reference.com/${path}`, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  const html = await res.text()
  await Bun.sleep(4000)
  return html
}

/** Every row of the first table body, keyed by each cell's data-stat. Links keep their href under `<stat>_href`. */
export function rows(html: string): Row[] {
  const body = html.slice(html.indexOf('<tbody'), html.indexOf('</tbody>'))
  const out: Row[] = []
  for (const [, tr] of body.matchAll(/<tr[^>]*>(.*?)<\/tr>/gs)) {
    const row: Row = {}
    const id = tr.match(/data-append-csv="([^"]+)"/)?.[1]
    if (id) row.id = id
    for (const [, stat, inner] of tr.matchAll(/data-stat="([^"]+)"[^>]*>(.*?)<\/t[dh]>/gs)) {
      row[stat] = inner.replace(/<[^>]+>/g, '').trim()
      const href = inner.match(/href="([^"]+)"/)?.[1]
      if (href) row[`${stat}_href`] = href
    }
    if (Object.keys(row).length > 1) out.push(row)
  }
  return out
}

// Traded players get a combined row ("2TM") first, then one row per team in order
export function byPlayer(list: Row[]) {
  const totals = new Map<string, Row>()
  const lastTeam = new Map<string, string>()
  for (const row of list) {
    if (!row.id) continue
    if (!totals.has(row.id)) totals.set(row.id, row)
    if (!/^\dTM$/.test(row.team_name_abbr)) lastTeam.set(row.id, row.team_name_abbr)
  }
  return { totals, lastTeam }
}

const num = (value: string | undefined) => (value === undefined || value === '' ? null : Number(value))

/** Every player's season line. `season` is the year it ends, as Basketball-Reference names it. */
export async function seasonPlayers(season: number, teams?: Map<string, string>): Promise<Player[]> {
  const advanced = byPlayer(rows(await page(`leagues/NBA_${season}_advanced.html`)))
  const perPoss = byPlayer(rows(await page(`leagues/NBA_${season}_per_poss.html`)))
  const perGame = byPlayer(rows(await page(`leagues/NBA_${season}_per_game.html`)))
  const out: Player[] = []
  for (const [id, a] of advanced.totals) {
    const p = perPoss.totals.get(id)
    const g = perGame.totals.get(id)
    if (!p || !g || !a.pos) continue
    out.push({
      id,
      name: a.name_display,
      team: teams?.get(id) ?? advanced.lastTeam.get(id) ?? '',
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

/** Where each player has played this season, from its per-game table. */
export async function currentTeams(season: number): Promise<Map<string, string>> {
  return byPlayer(rows(await page(`leagues/NBA_${season}_per_game.html`))).lastTeam
}
