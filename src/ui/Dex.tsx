import { useMemo, useState } from 'react'
import type { League } from '../core/league'
import { STATS } from '../core/types'
import { dexNo, Sprite, Types } from './pokemon'
import { ordinal, STAT_NAMES } from './format'
import { href } from './route'

const GENS = [
  { gen: 1, label: 'Kanto' },
  { gen: 2, label: 'Johto' },
  { gen: 3, label: 'Hoenn' },
  { gen: 4, label: 'Sinnoh' },
]

export function Dex({ league, id }: { league: League; id?: number }) {
  const [gen, setGen] = useState(0)
  const [matchedOnly, setMatchedOnly] = useState(false)
  const selected = id ? league.dex.find((p) => p.id === id) : undefined
  const list = useMemo(
    () => league.dex.filter((p) => (!gen || p.gen === gen) && (!matchedOnly || league.trainers.has(p.id))),
    [league, gen, matchedOnly],
  )

  return (
    <div className="dex">
      {selected && <Entry league={league} id={selected.id} />}
      <div className="dex-controls">
        <div className="filters" role="radiogroup" aria-label="Generation">
          <button role="radio" aria-checked={gen === 0} onClick={() => setGen(0)}>
            All 493
          </button>
          {GENS.map((g) => (
            <button key={g.gen} role="radio" aria-checked={gen === g.gen} onClick={() => setGen(g.gen)}>
              {g.label}
            </button>
          ))}
        </div>
        <label className="toggle">
          <input type="checkbox" checked={matchedOnly} onChange={(e) => setMatchedOnly(e.target.checked)} />
          Only Pokémon with a player
        </label>
      </div>
      <ol className="dex-grid">
        {list.map((p) => {
          const count = league.trainers.get(p.id)?.length ?? 0
          return (
            <li key={p.id}>
              <a href={href({ view: 'dex', id: p.id })} aria-current={p.id === id ? 'page' : undefined} className={count ? '' : 'unmatched'}>
                <Sprite pokemon={p} size={64} />
                <span className="dexno">{dexNo(p.id)}</span>
                <span className="mon-name">{p.name}</span>
                {count > 0 && <span className="badge">{count}</span>}
              </a>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Entry({ league, id }: { league: League; id: number }) {
  const pokemon = league.dex.find((p) => p.id === id)!
  const profile = league.dexProfiles.get(id)!
  const trainers = [...(league.trainers.get(id) ?? [])].sort((a, b) => b.matches[0].fit - a.matches[0].fit)
  return (
    <section className="entry">
      <Sprite pokemon={pokemon} size={160} />
      <div>
        <span className="dexno">{dexNo(pokemon.id)}</span>
        <h1>{pokemon.name}</h1>
        <p className="genus">{pokemon.genus}</p>
        <Types types={pokemon.types} />
        <table className="base">
          <tbody>
            {STATS.map((s) => (
              <tr key={s}>
                <th scope="row">{STAT_NAMES[s]}</th>
                <td>{pokemon.stats[s]}</td>
                <td>
                  <span className="bar" style={{ width: `${profile[s]}%` }} />
                </td>
                <td>{ordinal(profile[s])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="trainers">
        <h2>{trainers.length === 1 ? 'Matched player' : 'Matched players'}</h2>
        {trainers.length ? (
          <ul>
            {trainers.map((e) => (
              <li key={e.player.id}>
                <a href={href({ view: 'players', id: e.player.id })}>
                  {e.player.name} <small>{e.player.pos} {e.player.team}, {e.matches[0].fit} fit</small>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="meta">No player's best match is {pokemon.name} this season.</p>
        )}
      </div>
    </section>
  )
}
