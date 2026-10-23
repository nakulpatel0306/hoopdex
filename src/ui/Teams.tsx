import type { Entry, League } from '../core/league'
import { TEAMS } from '../core/teams'
import { Sprite, Types } from './pokemon'
import { href } from './route'

// A Pokémon party holds six. Ranking by minutes per game rather than total minutes keeps a
// star who missed a month in the party instead of on the bench.
const PARTY = 6

export function Teams({ league, team }: { league: League; team?: string }) {
  const codes = Object.keys(TEAMS).sort((a, b) => TEAMS[a].localeCompare(TEAMS[b]))
  const current = team && TEAMS[team] ? team : null

  return (
    <div className="teams">
      <nav className="team-picker" aria-label="Teams">
        {codes.map((code) => (
          <a key={code} href={href({ view: 'teams', team: code })} aria-current={code === current ? 'page' : undefined}>
            {code}
          </a>
        ))}
      </nav>
      {current ? <Party league={league} team={current} /> : <Parties league={league} codes={codes} />}
    </div>
  )
}

function partyOf(league: League, team: string) {
  const perGame = (e: Entry) => e.player.minutes / e.player.games
  return league.entries
    .filter((e) => e.player.team === team && e.matches.length > 0)
    .sort((a, b) => perGame(b) - perGame(a))
}

function Party({ league, team }: { league: League; team: string }) {
  const members = partyOf(league, team)
  const party = members.slice(0, PARTY)
  const bench = members.slice(PARTY)
  return (
    <section className="party">
      <h1>{TEAMS[team]}</h1>
      <p className="meta">The six players who played the most minutes per game in {league.season}, and the bench behind them.</p>
      <ol className="party-grid">
        {party.map((e) => {
          const m = e.matches[0]
          return (
            <li key={e.player.id}>
              <a href={href({ view: 'players', id: e.player.id })}>
                <Sprite pokemon={m.pokemon} size={96} />
                <span className="mon-name">{m.pokemon.name}</span>
                <Types types={m.pokemon.types} />
                <span className="player-name">
                  {e.player.name} <small>{e.player.pos}</small>
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
                  <Sprite pokemon={e.matches[0].pokemon} size={40} />
                  <span>
                    {e.player.name} <small>{e.matches[0].pokemon.name}</small>
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

function Parties({ league, codes }: { league: League; codes: string[] }) {
  return (
    <section>
      <h1>Every team as a party</h1>
      <p className="meta">Each team's six players with the most minutes per game in {league.season}, as their matched Pokémon. Pick a team to see the bench too.</p>
      <ul className="parties">
        {codes.map((code) => (
          <li key={code}>
            <a href={href({ view: 'teams', team: code })}>
              <span className="team-name">{TEAMS[code]}</span>
              <span className="row">
                {partyOf(league, code)
                  .slice(0, PARTY)
                  .map((e) => (
                    <Sprite key={e.player.id} pokemon={e.matches[0].pokemon} size={48} />
                  ))}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
