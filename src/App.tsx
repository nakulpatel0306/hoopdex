import { useEffect } from 'react'
import { buildLeague } from './core/league'
import type { Weights } from './core/profile'
import type { Player, Pokemon } from './core/types'
import players from './data/players.json'
import pokemon from './data/pokemon.json'
import weights from './data/weights.json'
import { Dex } from './ui/Dex'
import { Games } from './ui/Games'
import { Home } from './ui/Home'
import { How } from './ui/How'
import { Players } from './ui/Players'
import { href, useRoute, type Route } from './ui/route'
import { Teams } from './ui/Teams'

// Everything is precomputed from the snapshot once; matching 600 players takes a few milliseconds
const league = buildLeague(players as { season: string; fetched: string; players: Player[] }, pokemon as Pokemon[], weights as Weights)

const TABS: { view: Route['view']; label: string }[] = [
  { view: 'players', label: 'Players' },
  { view: 'teams', label: 'Teams' },
  { view: 'games', label: 'Games' },
  { view: 'dex', label: 'Pokédex' },
  { view: 'how', label: 'How it works' },
]

export default function App() {
  const route = useRoute()

  // Hash changes don't scroll on their own, so opening a card from a long list would leave it off-screen
  const key = JSON.stringify(route)
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [key])

  return (
    <>
      <header className={`shell ${route.view === 'home' ? 'on-home' : ''}`}>
        <a className="brand" href="#/">
          <span className="lens" aria-hidden />
          <span className="lights" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          Hoopdex
        </a>
        <nav className="tabs" aria-label="Sections">
          {TABS.map((t) => (
            <a key={t.view} href={href({ view: t.view } as Route)} aria-current={route.view === t.view ? 'page' : undefined}>
              {t.label}
            </a>
          ))}
        </nav>
      </header>
      {/* Keyed by view so each section slides in fresh, but not on every player picked within one */}
      <main key={route.view} className={`screen screen-${route.view}`}>
        {route.view === 'home' && <Home league={league} />}
        {route.view === 'players' && <Players league={league} id={route.id} />}
        {route.view === 'teams' && <Teams league={league} team={route.team} />}
        {route.view === 'games' && <Games league={league} id={route.id} />}
        {route.view === 'dex' && <Dex league={league} id={route.id} />}
        {route.view === 'how' && <How league={league} weights={weights as Weights} />}
      </main>
      <footer className="footer">
        <span>
          Built by <a href="https://nakul-patel.dev">Nakul Patel</a> · <a href="https://github.com/nakulpatel0306/hoopdex">Source on GitHub</a>
        </span>
        <span>
          Stats from <a href="https://www.basketball-reference.com/">Basketball-Reference</a>, Pokémon from{' '}
          <a href="https://pokeapi.co/">PokeAPI</a>. Not affiliated with the NBA or Nintendo.
        </span>
      </footer>
    </>
  )
}
