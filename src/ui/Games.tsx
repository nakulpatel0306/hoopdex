import { useMemo, type CSSProperties } from 'react'
import { simulate, type Battle } from '../core/battle'
import type { League } from '../core/league'
import { TEAMS } from '../core/teams'
import type { Game } from '../core/types'
import { GameView } from './GameView'
import { useSeason } from './season'
import { Sprite } from './pokemon'
import { href } from './route'
import { teamColor } from './teamColors'

export type Played = { game: Game; battle: Battle | null }

const realWinner = (g: Game) => (g.home.pts > g.away.pts ? 'home' : 'away')

export const mvpOf = (b: Battle) => [...b.home, ...b.away].reduce((best, x) => (x.damageDealt > best.damageDealt ? x : best))

const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

export function Games({ league, id }: { league: League; id?: string }) {
  const { season, error } = useSeason()
  const played = useMemo<Played[]>(() => {
    if (!season) return []
    const pokemonOf = (playerId: string) => league.byId.get(playerId)?.matches[0]?.pokemon
    return [...season.games].reverse().map((game) => ({ game, battle: simulate(game, pokemonOf) }))
  }, [season, league])

  if (error) return <p className="empty">This season's games didn't load. Check your connection and refresh the page.</p>
  if (!season) return <p className="empty">Loading this season's games…</p>

  const selected = id && played.find((p) => p.game.id === id)
  if (selected) return <GameView played={selected} />

  const battles = played.filter((p) => p.battle)
  const called = battles.filter((p) => p.battle!.winner === realWinner(p.game)).length
  const days = [...new Set(played.map((p) => p.game.date))]

  return (
    <div className="games">
      <h1 className="page-title">Every game as a Pokémon battle</h1>
      <p className="meta">
        Each real {season.season} game, replayed as a battle between the two teams' Pokémon. Each side fields the six
        players who played the most minutes that night, and each Pokémon hits harder or softer with its player's real Game
        Score.
      </p>
      <div className="tally">
        <strong>
          {called} of {battles.length}
        </strong>
        <span>battles went the same way as the real game</span>
      </div>
      {days.map((day) => (
        <section key={day} className="day">
          <h2>{dayLabel(day)}</h2>
          <ul className="game-list">
            {played
              .filter((p) => p.game.date === day)
              .map(({ game, battle }) => {
                const real = realWinner(game)
                return (
                  <li key={game.id}>
                    <a href={href({ view: 'games', id: game.id })}>
                      <span className="score">
                        {(['away', 'home'] as const).map((side) => (
                          <span key={side} className={side === real ? 'won' : ''} style={{ '--team': teamColor(game[side].team) } as CSSProperties}>
                            <b>{game[side].team}</b> {game[side].pts}
                          </span>
                        ))}
                        {game.overtimes && <small>{game.overtimes}</small>}
                      </span>
                      {battle ? (
                        <span className="battle-result">
                          <Sprite pokemon={mvpOf(battle).pokemon} size={48} />
                          <span>
                            {TEAMS[game[battle.winner].team]?.split(' ').at(-1)} win the battle
                            <small className={battle.winner === real ? 'agree' : 'upset'}>
                              {battle.winner === real ? 'Same as the real game' : 'Upset'}
                            </small>
                          </span>
                        </span>
                      ) : (
                        <span className="battle-result none">Not enough matched players for a battle</span>
                      )}
                    </a>
                  </li>
                )
              })}
          </ul>
        </section>
      ))}
      <p className="meta">Box scores from Basketball-Reference, updated {season.updated}.</p>
    </div>
  )
}
