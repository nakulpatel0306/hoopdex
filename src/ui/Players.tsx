import { useMemo, useState } from 'react'
import type { League } from '../core/league'
import type { Group } from '../core/types'
import { MatchCard } from './MatchCard'
import { Sprite } from './pokemon'
import { href } from './route'

const FILTERS: { value: Group | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'guards', label: 'Guards' },
  { value: 'forwards', label: 'Forwards' },
  { value: 'centers', label: 'Centers' },
]

// Accents and case shouldn't stop "jokic" finding Jokić
const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export function Players({ league, id }: { league: League; id?: string }) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<Group | 'all'>('all')
  const selected = (id && league.byId.get(id)) || league.entries[0]

  const list = useMemo(() => {
    const q = fold(query.trim())
    return league.entries.filter(
      (e) => (group === 'all' || e.group === group) && (!q || fold(e.player.name).includes(q) || fold(e.player.team).includes(q)),
    )
  }, [league, query, group])

  return (
    <div className="players">
      <aside className="roster" aria-label="Players">
        <input
          className="search"
          type="search"
          placeholder="Search players or teams"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search players or teams"
        />
        <div className="filters" role="radiogroup" aria-label="Position">
          {FILTERS.map((f) => (
            <button key={f.value} role="radio" aria-checked={group === f.value} onClick={() => setGroup(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
        <p className="count">{list.length} players, most minutes first</p>
        <ol className="list">
          {list.map((e) => {
            const top = e.matches[0]
            return (
              <li key={e.player.id}>
                <a href={href({ view: 'players', id: e.player.id })} aria-current={e === selected ? 'page' : undefined}>
                  <span className="who">
                    <span className="name">{e.player.name}</span>
                    <span className="sub">
                      {e.player.pos} {e.player.team}
                    </span>
                  </span>
                  {top ? (
                    <span className="mon">
                      <span>{top.pokemon.name}</span>
                      <Sprite pokemon={top.pokemon} size={40} />
                    </span>
                  ) : (
                    <span className="mon none">Too few minutes</span>
                  )}
                </a>
              </li>
            )
          })}
          {list.length === 0 && <li className="empty">No player or team matches "{query}". Try a last name or a team code like BOS.</li>}
        </ol>
      </aside>
      <MatchCard key={selected.player.id} entry={selected} league={league} />
    </div>
  )
}
