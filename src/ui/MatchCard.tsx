import { useState } from 'react'
import type { Entry, League } from '../core/league'
import { closestAndFurthest, type Candidate } from '../core/match'
import { AXES, MIN_MINUTES } from '../core/profile'
import { TEAMS } from '../core/teams'
import { Mirror } from './Mirror'
import { dexNo, Sprite, Types } from './pokemon'
import { GROUP_NAMES, ordinal } from './format'
import { useCountUp } from './motion'
import { href } from './route'

export function MatchCard({ entry, league }: { entry: Entry; league: League }) {
  const [picked, setPicked] = useState(0)
  const { player } = entry
  const match = entry.matches[picked] ?? entry.matches[0]

  return (
    <article className="card">
      <header className="card-head">
        <a className="back" href={href({ view: 'players' })}>
          All players
        </a>
        <h1>{player.name}</h1>
        <p className="meta">
          {player.pos}, <a href={href({ view: 'teams', team: player.team })}>{TEAMS[player.team] ?? 'Free agent'}</a>.{' '}
          {player.ppg.toFixed(1)} points, {player.rpg.toFixed(1)} rebounds and {player.apg.toFixed(1)} assists a game over{' '}
          {player.games} games in {league.season}.
        </p>
      </header>

      {!match ? (
        <p className="empty">
          {player.name} played {player.minutes} minutes in {league.season}. Matches need at least {MIN_MINUTES}, since a
          few games can swing every rate stat.
        </p>
      ) : (
        <>
          <section className="reveal" aria-live="polite">
            <a key={match.pokemon.id} className="reveal-art" href={href({ view: 'dex', id: match.pokemon.id })}>
              <Sprite pokemon={match.pokemon} size={160} eager />
            </a>
            <div className="reveal-text">
              <span className="dexno">
                {picked === 0 ? 'Best match' : `Runner-up ${picked + 1}`} · {dexNo(match.pokemon.id)}
              </span>
              <h2>{match.pokemon.name}</h2>
              <p className="genus">{match.pokemon.genus}</p>
              <Types types={match.pokemon.types} />
            </div>
            <FitRing fit={match.fit} />
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
      {ordinal(match.profile[furthest])} among Pokémon. Skills that hold steady from season to season count a little more.
    </p>
  )
}

// The ring fills to the fit score as the number counts up to it
function FitRing({ fit }: { fit: number }) {
  const shown = useCountUp(fit)
  const r = 42
  const round = 2 * Math.PI * r
  return (
    <div className="fit" title="100 minus the weighted average percentile gap across all six stats">
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r={r} className="fit-track" />
        <circle cx="50" cy="50" r={r} className="fit-fill" strokeDasharray={round} strokeDashoffset={round * (1 - shown / 100)} />
      </svg>
      <strong>{shown}</strong>
      <span>fit</span>
    </div>
  )
}
