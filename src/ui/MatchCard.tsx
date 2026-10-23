import { useState } from 'react'
import type { Entry, League } from '../core/league'
import { closestAndFurthest, type Candidate } from '../core/match'
import { AXES, MIN_MINUTES } from '../core/profile'
import { TEAMS } from '../core/teams'
import { Mirror } from './Mirror'
import { dexNo, Sprite, Types } from './pokemon'
import { GROUP_NAMES, ordinal } from './format'
import { href } from './route'

export function MatchCard({ entry, league }: { entry: Entry; league: League }) {
  const [picked, setPicked] = useState(0)
  const { player } = entry
  const match = entry.matches[picked] ?? entry.matches[0]

  return (
    <article className="card">
      <header className="card-head">
        <div>
          <h1>{player.name}</h1>
          <p className="meta">
            {player.pos}, {TEAMS[player.team] ?? 'Free agent'}. {player.ppg.toFixed(1)} points, {player.rpg.toFixed(1)}{' '}
            rebounds and {player.apg.toFixed(1)} assists a game over {player.games} games in {league.season}.
          </p>
        </div>
      </header>

      {!match ? (
        <p className="empty">
          {player.name} played {player.minutes} minutes in {league.season}. Matches need at least {MIN_MINUTES}, since a
          few games can swing every rate stat.
        </p>
      ) : (
        <>
          <section className="reveal" aria-live="polite">
            <a className="reveal-art" href={href({ view: 'dex', id: match.pokemon.id })}>
              <Sprite pokemon={match.pokemon} size={160} />
            </a>
            <div className="reveal-text">
              <span className="dexno">{dexNo(match.pokemon.id)}</span>
              <h2>{match.pokemon.name}</h2>
              <p className="genus">{match.pokemon.genus}</p>
              <Types types={match.pokemon.types} />
            </div>
            <div className="fit" title="100 minus the average percentile gap across all six stats">
              <strong>{match.fit}</strong>
              <span>fit</span>
            </div>
          </section>

          <Summary entry={entry} match={match} />

          <Mirror entry={entry} match={match} players={league.entries.map((e) => e.player)} />

          <section className="runners">
            <h3>Top candidates</h3>
            <ul>
              {entry.matches.slice(0, 6).map((c, i) => (
                <li key={c.pokemon.id}>
                  <button className={i === picked ? 'on' : ''} aria-pressed={i === picked} onClick={() => setPicked(i)}>
                    <Sprite pokemon={c.pokemon} size={56} />
                    <span>{c.pokemon.name}</span>
                    <small>{c.fit} fit</small>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </article>
  )
}

function Summary({ entry, match }: { entry: Entry; match: Candidate }) {
  const mine = entry.profile!
  const { closest, furthest } = closestAndFurthest(mine, match.profile)
  const [a, b] = closest.map((s) => AXES[s].skill.toLowerCase())
  const last = entry.player.name.split(' ').at(-1)
  return (
    <p className="summary">
      {last} and {match.pokemon.name} line up closest on {a} and {b}. The biggest gap is{' '}
      {AXES[furthest].skill.toLowerCase()}: {ordinal(mine[furthest])} percentile among {GROUP_NAMES[entry.group]}, against{' '}
      {ordinal(match.profile[furthest])} among Pokémon. All six stats count equally.
    </p>
  )
}
