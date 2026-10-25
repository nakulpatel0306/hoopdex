import type { CSSProperties } from 'react'
import type { Entry, League } from '../core/league'
import { TEAMS } from '../core/teams'
import { Sprite, Types } from './pokemon'
import { href } from './route'
import { teamColor } from './teamColors'

// A Pokémon party holds six. Ranking by minutes per game rather than total minutes keeps a
// star who missed a month in the party instead of on the bench.
const PARTY = 6

const perGame = (e: Entry) => e.player.minutes / e.player.games

export function partyOf(league: League, team: string) {
  return league.entries.filter((e) => e.player.team === team && e.matches.length > 0).sort((a, b) => perGame(b) - perGame(a))
}

const CODES = Object.keys(TEAMS).sort((a, b) => TEAMS[a].localeCompare(TEAMS[b]))

const tint = (code: string) => ({ '--team': teamColor(code) }) as CSSProperties

export function Teams({ league, team }: { league: League; team?: string }) {
  return team && TEAMS[team] ? <Party league={league} team={team} /> : <Parties league={league} />
}

function Party({ league, team }: { league: League; team: string }) {
  const members = partyOf(league, team)
  const party = members.slice(0, PARTY)
  const bench = members.slice(PARTY)
  const i = CODES.indexOf(team)
  const prev = CODES[(i + CODES.length - 1) % CODES.length]
  const next = CODES[(i + 1) % CODES.length]
  // Bars are relative to the team's busiest player, so the party's pecking order shows at a glance
  const most = Math.max(...party.map(perGame))

  return (
    <section className="party" style={tint(team)}>
      <header className="party-head">
        <a className="back" href={href({ view: 'teams' })}>
          All teams
        </a>
        <h1>{TEAMS[team]}</h1>
        <p className="meta">The six players with the most minutes per game in {league.season}.</p>
        <nav className="party-step" aria-label="Other teams">
          <a href={href({ view: 'teams', team: prev })} aria-label={TEAMS[prev]}>
            ← {prev}
          </a>
          <a href={href({ view: 'teams', team: next })} aria-label={TEAMS[next]}>
            {next} →
          </a>
        </nav>
      </header>

      <ol className="party-grid">
        {party.map((e, slot) => {
          const m = e.matches[0]
          return (
            <li key={e.player.id} style={{ '--slot': slot } as CSSProperties}>
              <a href={href({ view: 'players', id: e.player.id })} className={slot === 0 ? 'lead' : ''}>
                <span className="slot-art">
                  <Sprite pokemon={m.pokemon} size={96} />
                </span>
                <span className="slot-text">
                  <span className="mon-name">{m.pokemon.name}</span>
                  <span className="player-name">
                    {e.player.name} <small>{e.player.pos}</small>
                  </span>
                  <Types types={m.pokemon.types} />
                  <span className="mpg" title="Minutes per game">
                    <span>MIN</span>
                    <span className="mpg-track">
                      <i style={{ width: `${(100 * perGame(e)) / most}%` }} />
                    </span>
                    <span>{perGame(e).toFixed(1)}</span>
                  </span>
                </span>
              </a>
            </li>
          )
        })}
      </ol>

      {bench.length > 0 && (
        <>
          <h2>Bench</h2>
          <ul className="bench">
            {bench.map((e) => (
              <li key={e.player.id}>
                <a href={href({ view: 'players', id: e.player.id })}>
                  <Sprite pokemon={e.matches[0].pokemon} size={48} />
                  <span>
                    <b>{e.player.name}</b>
                    <small>{e.matches[0].pokemon.name}</small>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function Parties({ league }: { league: League }) {
  return (
    <section className="parties-page">
      <h1>Every team as a party</h1>
      <p className="meta">Each team's six players with the most minutes per game in {league.season}, as their matched Pokémon.</p>
      <ul className="parties">
        {CODES.map((code) => (
          <li key={code} style={tint(code)}>
            <a href={href({ view: 'teams', team: code })}>
              <span className="team-name">
                <b>{code}</b> {TEAMS[code]}
              </span>
              <span className="row">
                {partyOf(league, code)
                  .slice(0, PARTY)
                  .map((e) => (
                    <Sprite key={e.player.id} pokemon={e.matches[0].pokemon} size={56} />
                  ))}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
