import { useState, type CSSProperties } from 'react'
import type { Battle, Battler } from '../core/battle'
import { TEAMS } from '../core/teams'
import type { Game } from '../core/types'
import { BattleReplay } from './BattleReplay'
import { mvpOf, type Played } from './Games'
import { Sprite } from './pokemon'
import { href } from './route'
import { teamColor } from './teamColors'

const SIDES = ['away', 'home'] as const

export function GameView({ played }: { played: Played }) {
  const { game, battle } = played
  // The result waits for the battle to end, so the replay isn't spoiled
  const [finished, setFinished] = useState(false)
  const realWinner = game.home.pts > game.away.pts ? 'home' : 'away'
  return (
    <article className="game">
      <a className="back" href={href({ view: 'games' })}>
        All games
      </a>
      <header className="game-head">
        <h1 className="visually-hidden">
          {TEAMS[game.away.team]} at {TEAMS[game.home.team]}
        </h1>
        <Scoreboard game={game} />
        <p className="meta">
          {new Date(`${game.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}, {game.arena}
        </p>
      </header>

      {battle ? (
        <>
          <BattleReplay key={game.id} battle={battle} game={game} onFinish={() => setFinished(true)} />
          {finished ? (
            <div className="aftermath">
              <p className={`verdict ${battle.winner === realWinner ? 'agree' : 'upset'}`}>
                <strong>{battle.winner === realWinner ? 'Called it' : 'Upset!'}</strong>
                {TEAMS[game[battle.winner].team]} won the battle in {battle.turns} turns.{' '}
                {battle.winner === realWinner ? 'Same result as the real game.' : `${TEAMS[game[realWinner].team]} won the real game.`}
              </p>
              <MatchStats battle={battle} game={game} />
              {SIDES.map((side) => (
                <PartyTable key={side} team={game[side].team} members={battle[side]} />
              ))}
            </div>
          ) : (
            <p className="meta">The result and match stats show up when the battle ends, or skip to the result.</p>
          )}
        </>
      ) : (
        <p className="empty">Not enough of tonight's players have a Pokémon yet for a battle. Rookies get one once they've played a season.</p>
      )}
    </article>
  )
}

// The real result up top, team colors and all, with the quarters underneath
function Scoreboard({ game }: { game: Game }) {
  const periods = Math.max(game.home.periods.length, game.away.periods.length)
  const label = (i: number) => (i < 4 ? `Q${i + 1}` : `OT${periods > 5 ? i - 3 : ''}`)
  return (
    <div className="scoreboard">
      {SIDES.map((side) => {
        const won = game[side].pts > game[side === 'home' ? 'away' : 'home'].pts
        return (
          <a
            key={side}
            href={href({ view: 'teams', team: game[side].team })}
            className={`sb-team ${side} ${won ? 'won' : ''}`}
            style={{ '--team': teamColor(game[side].team) } as CSSProperties}
          >
            <span className="sb-code">{game[side].team}</span>
            <span className="sb-name">{TEAMS[game[side].team]}</span>
            <span className="sb-pts">{game[side].pts}</span>
          </a>
        )
      })}
      <table className="line-score">
        <caption>Final{game.overtimes ? ` (${game.overtimes})` : ''}</caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">Team</span>
            </th>
            {Array.from({ length: periods }, (_, i) => (
              <th scope="col" key={i}>
                {label(i)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SIDES.map((side) => (
            <tr key={side}>
              <th scope="row">{game[side].team}</th>
              {game[side].periods.map((p, i) => (
                <td key={i}>{p}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MatchStats({ battle, game }: { battle: Battle; game: Game }) {
  const moves = (side: 'home' | 'away') => battle.events.filter((e) => e.kind === 'move' && e.side === side)
  const count = (side: 'home' | 'away', test: (e: Extract<Battle['events'][number], { kind: 'move' }>) => boolean) =>
    moves(side).filter((e) => e.kind === 'move' && test(e)).length
  const rows: [string, (side: 'home' | 'away') => number | string][] = [
    ['Pokémon left', (s) => `${battle[s].filter((b) => b.hp > 0).length} of ${battle[s].length}`],
    ['Knockouts', (s) => battle[s].reduce((sum, b) => sum + b.kos, 0)],
    ['Damage dealt', (s) => battle[s].reduce((sum, b) => sum + b.damageDealt, 0)],
    ['Attacks', (s) => moves(s).length],
    ['Super effective', (s) => count(s, (e) => e.effect > 1)],
    ['Critical hits', (s) => count(s, (e) => e.crit)],
    ['Missed', (s) => count(s, (e) => e.missed)],
  ]
  const mvp = mvpOf(battle)
  return (
    <section className="match-stats">
      <h2>Match stats</h2>
      <div className="mvp">
        <Sprite pokemon={mvp.pokemon} size={72} />
        <div>
          <span className="label">Battle MVP</span>
          <strong>{mvp.pokemon.name}</strong>
          <span>
            {mvp.player.name}, {mvp.damageDealt} damage and {mvp.kos} {mvp.kos === 1 ? 'knockout' : 'knockouts'}. Really scored{' '}
            {mvp.player.pts} points that night.
          </span>
        </div>
      </div>
      <table className="versus">
        <thead>
          <tr>
            <th scope="col">{game.away.team}</th>
            <th scope="col" />
            <th scope="col">{game.home.team}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td>{value('away')}</td>
              <th scope="row">{label}</th>
              <td>{value('home')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

const signedPct = (form: number) => {
  const pct = Math.round((form - 1) * 100)
  return pct > 0 ? `+${pct}%` : `${pct}%`
}

function PartyTable({ team, members }: { team: string; members: Battler[] }) {
  return (
    <section className="party-table">
      <h2>{TEAMS[team]}</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Pokémon</th>
              <th scope="col">Player</th>
              <th scope="col">Real line</th>
              <th scope="col" title="How much harder its attacks land, from the player's real Game Score">Form</th>
              <th scope="col">Damage</th>
              <th scope="col">KOs</th>
              <th scope="col">HP left</th>
            </tr>
          </thead>
          <tbody>
            {members.map((b) => (
              <tr key={b.player.id} className={b.hp <= 0 ? 'fainted' : ''}>
                <td className="mon">
                  <span>
                    <Sprite pokemon={b.pokemon} size={40} />
                    {b.pokemon.name}
                  </span>
                </td>
                <td>
                  <a href={href({ view: 'players', id: b.player.id })}>{b.player.name}</a>
                </td>
                <td>
                  {b.player.pts} pts, {b.player.trb} reb, {b.player.ast} ast <small>in {Math.round(b.player.minutes)} min</small>
                </td>
                <td>{signedPct(b.form)}</td>
                <td>{b.damageDealt}</td>
                <td>{b.kos}</td>
                <td>{b.hp > 0 ? `${b.hp}/${b.maxHp}` : 'Fainted'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
