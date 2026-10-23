// Fetches this season's played games and their box scores into public/games.json. Run with
// `bun scripts/games.ts`. Box scores already in the file are kept, so each run only fetches
// new games; the Pages workflow runs it daily to pick up the night's results.
import type { BoxLine, Game } from '../src/core/types.ts'
import { page, rows } from './bbref.ts'

const SEASON = 2027 // 2026-27, named by the year it ends
const MONTHS = ['october', 'november', 'december', 'january', 'february', 'march', 'april']
const OUT = 'public/games.json'

const teamOf = (href: string | undefined) => href?.match(/\/teams\/([A-Z]{3})\//)?.[1] ?? ''
const minutes = (mp: string | undefined) => {
  const [m, s] = (mp ?? '').split(':').map(Number)
  return Number.isFinite(m) ? m + (s || 0) / 60 : 0
}

function boxFor(html: string, team: string): BoxLine[] {
  const start = html.indexOf(`id="box-${team}-game-basic"`)
  if (start < 0) return []
  const table = html.slice(start, html.indexOf('</table>', start))
  return rows(table)
    .filter((r) => r.id && r.mp && /^\d+:\d+$/.test(r.mp))
    .map((r) => ({
      id: r.id,
      name: r.player,
      minutes: Math.round(minutes(r.mp) * 10) / 10,
      pts: Number(r.pts),
      trb: Number(r.trb),
      ast: Number(r.ast),
      gameScore: Number(r.game_score),
    }))
}

/** Points per period from the line score, which Basketball-Reference ships inside an HTML comment. */
function lineScore(html: string, team: string): number[] {
  const start = html.indexOf('id="line_score"')
  if (start < 0) return []
  const table = html.slice(start, html.indexOf('</table>', start))
  const row = table.match(new RegExp(`<tr[^>]*>(?:(?!</tr>).)*?/teams/${team}/(?:(?!</tr>).)*</tr>`, 's'))?.[0] ?? ''
  const cells = [...row.matchAll(/data-stat="([^"]+)"[^>]*>(\d+)</g)].filter(([, stat]) => stat !== 'T').map(([, , v]) => Number(v))
  return cells
}

const existing: Game[] = (await Bun.file(OUT).exists()) ? (await Bun.file(OUT).json()).games : []
const known = new Map(existing.map((g) => [g.id, g]))

const now = new Date()
const games: Game[] = []
let fetched = 0
let failed = 0
for (const month of MONTHS) {
  let schedule: string
  try {
    schedule = await page(`leagues/NBA_${SEASON}_games-${month}.html`)
  } catch (error) {
    // Months that haven't been published yet 404; anything else is worth a warning
    if (!String(error).includes('404')) console.warn(`${month}: ${error}`)
    break
  }
  const played = rows(schedule).filter((r) => r.home_pts && r.box_score_text_href)
  for (const r of played) {
    const id = r.box_score_text_href.match(/boxscores\/(\w+)\.html/)![1]
    const cached = known.get(id)
    if (cached) {
      games.push(cached)
      continue
    }
    const home = teamOf(r.home_team_name_href)
    const away = teamOf(r.visitor_team_name_href)
    try {
      const box = await page(r.box_score_text_href.slice(1))
      games.push({
        id,
        date: new Date(r.date_game).toISOString().slice(0, 10),
        home: { team: home, pts: Number(r.home_pts), periods: lineScore(box, home), box: boxFor(box, home) },
        away: { team: away, pts: Number(r.visitor_pts), periods: lineScore(box, away), box: boxFor(box, away) },
        overtimes: r.overtimes,
        arena: r.arena_name,
      })
      fetched++
    } catch (error) {
      failed++
      console.warn(`${id}: ${error}`)
    }
  }
  // No need to look past the month we're in
  if (month === now.toLocaleString('en-US', { month: 'long' }).toLowerCase()) break
}

if (games.length === 0) throw new Error('No games parsed; the schedule layout may have changed')
await Bun.write(OUT, JSON.stringify({ season: '2026-27', updated: now.toISOString().slice(0, 10), games }))
console.log(`${games.length} games (${fetched} new${failed ? `, ${failed} failed and will be retried next run` : ''})`)
