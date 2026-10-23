import { useEffect } from 'react'
import { buildLeague } from './core/league'
import type { Weights } from './core/profile'
import type { Player, Pokemon } from './core/types'
import players from './data/players.json'
import pokemon from './data/pokemon.json'
import weights from './data/weights.json'
import { Dex } from './ui/Dex'
import { How } from './ui/How'
import { Players } from './ui/Players'
import { href, useRoute, type Route } from './ui/route'
import { Teams } from './ui/Teams'

// Everything is precomputed from the snapshot once; matching 600 players takes a few milliseconds
const league = buildLeague(players as { season: string; fetched: string; players: Player[] }, pokemon as Pokemon[], weights as Weights)

const TABS: { view: Route['view']; label: string }[] = [
  { view: 'players', label: 'Players' },
  { view: 'teams', label: 'Teams' },
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
      <header className="shell">
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
      <main className="screen">
        {route.view === 'players' && <Players league={league} id={route.id} />}
        {route.view === 'teams' && <Teams league={league} team={route.team} />}
        {route.view === 'dex' && <Dex league={league} id={route.id} />}
        {route.view === 'how' && <How league={league} weights={weights as Weights} />}
      </main>
    </>
  )
}
