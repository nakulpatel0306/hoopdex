import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import type { Entry, League } from '../core/league'
import { closestAndFurthest } from '../core/match'
import { AXES } from '../core/profile'
import { TEAMS } from '../core/teams'
import { fold, ordinal } from './format'
import { prefersStill, useCountUp } from './motion'
import { dexNo, Sprite, Types } from './pokemon'
import { href } from './route'
import { useSeason } from './season'
import { partyOf } from './Teams'

const REEL = 8
const REEL_MS = 3600

// The league's top scorers, one per Pokémon, so the reel never shows the same match twice
function featured(league: League): Entry[] {
  const seen = new Set<number>()
  return league.entries
    .filter((e) => e.matches.length > 0)
    .sort((a, b) => b.player.ppg - a.player.ppg)
    .filter((e) => !seen.has(e.matches[0].pokemon.id) && seen.add(e.matches[0].pokemon.id))
    .slice(0, REEL)
}

export function Home({ league }: { league: League }) {
  const stars = useMemo(() => featured(league), [league])
  const matched = league.entries.filter((e) => e.matches.length > 0).length

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{league.season} season · {matched} players · 493 Pokémon</p>
          <h1>
            Every NBA player <span>is a Pokémon.</span>
          </h1>
          <p className="lede">
            Scoring becomes Attack, playmaking becomes Speed, rebounding becomes Sp. Def. Each player gets the Pokémon whose base
            stats rank where their real stats do.
          </p>
          <Search league={league} />
          <p className="try">
            Try{' '}
            {stars.slice(0, 3).map((e) => (
              <a key={e.player.id} href={href({ view: 'players', id: e.player.id })}>
                {e.player.name.split(' ').at(-1)}
              </a>
            ))}
          </p>
        </div>
        <Device stars={stars} />
      </section>

      <Tally league={league} />

      <section className="doors" aria-label="Explore">
        <Door to={href({ view: 'players' })} title="Players" blurb="Look up anyone and see why they got their Pokémon" tint="var(--player)">
          {stars.slice(3, 6).map((e) => (
            <Sprite key={e.player.id} pokemon={e.matches[0].pokemon} size={64} />
          ))}
        </Door>
        <Door to={href({ view: 'teams' })} title="Teams" blurb="All 30 rosters as a party of six" tint="#e3a81b">
          <TeamPreview league={league} />
        </Door>
        <Door to={href({ view: 'games' })} title="Games" blurb="Every real game this season, replayed as a battle" tint="#4f9a45">
          <span className="versus-mini">
            <Sprite pokemon={stars[0].matches[0].pokemon} size={64} back />
            <b>VS</b>
            <Sprite pokemon={stars[1].matches[0].pokemon} size={64} />
          </span>
        </Door>
        <Door to={href({ view: 'dex' })} title="Pokédex" blurb={`${league.trainers.size} of 493 Pokémon have a player. Find out who`} tint="var(--mon)">
          {[25, 6, 150].map((id) => (
            <Sprite key={id} pokemon={league.dex[id - 1]} size={64} />
          ))}
        </Door>
      </section>

      <a className="how-teaser" href={href({ view: 'how' })}>
        <span>
          <strong>Not random, just percentiles.</strong> Players are ranked against their position, Pokémon against all 493, and
          the closest fit across all six stats wins.
        </span>
        <span className="go">How it works</span>
      </a>
    </div>
  )
}

function Search({ league }: { league: League }) {
  const [query, setQuery] = useState('')
  const q = fold(query.trim())
  const results = q
    ? league.entries.filter((e) => fold(e.player.name).includes(q) || fold(TEAMS[e.player.team] ?? '').includes(q)).slice(0, 6)
    : []
  return (
    <form
      className="hero-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        if (results[0]) window.location.hash = href({ view: 'players', id: results[0].player.id })
      }}
    >
      <input
        type="search"
        placeholder="Who's your favorite player?"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search for a player"
        autoComplete="off"
      />
      {q && (
        <ul className="results">
          {results.map((e) => (
            <li key={e.player.id}>
              <a href={href({ view: 'players', id: e.player.id })}>
                <span>
                  <b>{e.player.name}</b> <small>{e.player.pos} {e.player.team}</small>
                </span>
                {e.matches[0] ? (
                  <span className="mon">
                    {e.matches[0].pokemon.name}
                    <Sprite pokemon={e.matches[0].pokemon} size={40} />
                  </span>
                ) : (
                  <small>Too few minutes</small>
                )}
              </a>
            </li>
          ))}
          {results.length === 0 && <li className="none">No player called "{query}". Try a last name.</li>}
        </ul>
      )}
    </form>
  )
}

// The Pokédex's screen flips through star matches on its own, and pauses while you look at it
function Device({ stars }: { stars: Entry[] }) {
  const [at, setAt] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || prefersStill()) return
    const timer = setTimeout(() => setAt((i) => (i + 1) % stars.length), REEL_MS)
    return () => clearTimeout(timer)
  }, [at, paused, stars.length])

  const entry = stars[at]
  const match = entry.matches[0]
  const [a, b] = closestAndFurthest(entry.profile!, match.profile).closest
  return (
    <div className="device" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="device-top">
        <span key={at} className="lens big" aria-hidden />
        <span className="lights" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      </div>
      <a className="device-screen" href={href({ view: 'players', id: entry.player.id })} aria-live="polite">
        <span key={at} className="slide">
          <span className="slide-art">
            <Sprite pokemon={match.pokemon} size={160} eager />
          </span>
          <span className="slide-text">
            <span className="who">{entry.player.name} is</span>
            <span className="mon-name">{match.pokemon.name}</span>
            <span className="slide-meta">
              {dexNo(match.pokemon.id)} <Types types={match.pokemon.types} />
            </span>
            <span className="why">
              {ordinal(entry.profile![a])} {AXES[a].skill.toLowerCase()}, {ordinal(entry.profile![b])} {AXES[b].skill.toLowerCase()}
            </span>
          </span>
          <span className="slide-fit">
            <b>{match.fit}</b> fit
          </span>
        </span>
      </a>
      <div className="device-dots" role="tablist" aria-label="Featured matches">
        {stars.map((e, i) => (
          <button
            key={e.player.id}
            role="tab"
            aria-selected={i === at}
            aria-label={e.player.name}
            onClick={() => setAt(i)}
          />
        ))}
      </div>
    </div>
  )
}

function Tally({ league }: { league: League }) {
  const { season } = useSeason()
  const matched = league.entries.filter((e) => e.matches.length > 0).length
  return (
    <section className="tally-band" aria-label="By the numbers">
      <Count n={matched} label="players matched" />
      <Count n={league.trainers.size} label="different Pokémon picked" />
      <Count n={30} label="teams as parties" />
      {season && <Count n={season.games.length} label="real games battled" />}
    </section>
  )
}

function Count({ n, label }: { n: number; label: string }) {
  const shown = useCountUp(n, 1200)
  return (
    <div>
      <b>{shown}</b>
      <span>{label}</span>
    </div>
  )
}

function Door({ to, title, blurb, tint, children }: { to: string; title: string; blurb: string; tint: string; children: ReactNode }) {
  return (
    <a className="door" href={to} style={{ '--tint': tint } as CSSProperties}>
      <span className="door-art">{children}</span>
      <span className="door-text">
        <b>{title}</b>
        <span>{blurb}</span>
      </span>
    </a>
  )
}

function TeamPreview({ league }: { league: League }) {
  return (
    <>
      {partyOf(league, 'GSW')
        .slice(0, 3)
        .map((e) => (
          <Sprite key={e.player.id} pokemon={e.matches[0].pokemon} size={64} />
        ))}
    </>
  )
}
