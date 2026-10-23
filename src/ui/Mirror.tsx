import { Fragment, useMemo, useState } from 'react'
import { percentiles } from '../core/percentile'
import { AXES, qualified } from '../core/profile'
import type { Candidate } from '../core/match'
import type { Entry } from '../core/league'
import { STATS, type Player, type Stat } from '../core/types'
import { GROUP_NAMES, ordinal, STAT_NAMES } from './format'

// The player's percentiles grow left from a shared spine and the Pokémon's grow right, so a
// good match reads as a symmetrical shape. Each row opens to show the metrics behind it.
export function Mirror({ entry, match, players }: { entry: Entry; match: Candidate; players: Player[] }) {
  const [open, setOpen] = useState<Stat | null>(null)
  const peers = useMemo(() => qualified(players, entry.group), [players, entry.group])
  const profile = entry.profile!

  return (
    <div className="mirror" role="group" aria-label={`${entry.player.name} against ${match.pokemon.name}, stat by stat`}>
      <div className="mirror-head">
        <span>{entry.player.name.split(' ').at(-1)}, among {GROUP_NAMES[entry.group]}</span>
        <span />
        <span>{match.pokemon.name}, among 493 Pokémon</span>
      </div>
      {STATS.map((stat) => {
        const mine = profile[stat]
        const theirs = match.profile[stat]
        const expanded = open === stat
        return (
          <Fragment key={stat}>
            <div className="mirror-row">
              <div className="side left">
                <span className="pct">{ordinal(mine)}</span>
                <span className="track">
                  <span className="bar" style={{ width: `${mine}%` }} />
                </span>
              </div>
              <button
                className="spine"
               
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : stat)}
                title={`Show the ${AXES[stat].skill.toLowerCase()} metrics`}
              >
                <span className="skill">{AXES[stat].skill}</span>
                {AXES[stat].skill !== STAT_NAMES[stat] && <span className="stat">{STAT_NAMES[stat]}</span>}
              </button>
              <div className="side right">
                <span className="track">
                  <span className="bar" style={{ width: `${theirs}%` }} />
                </span>
                <span className="pct">
                  {ordinal(theirs)} <small>base {match.pokemon.stats[stat]}</small>
                </span>
              </div>
            </div>
            {expanded && (
              <div className="mirror-detail">
                <Metrics stat={stat} player={entry.player} peers={peers} />
              </div>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

function Metrics({ stat, player, peers }: { stat: Stat; player: Player; peers: Player[] }) {
  const rows = useMemo(() => {
    const i = peers.findIndex((p) => p.id === player.id)
    return AXES[stat].metrics.map((m) => ({ label: m.label, value: m.display(player), pct: percentiles(peers.map(m.value))[i] }))
  }, [stat, player, peers])
  return (
    <dl>
      {rows.map((r) => (
        <div key={r.label}>
          <dt>{r.label}</dt>
          <dd>
            {r.value} <small>{ordinal(r.pct)}</small>
          </dd>
        </div>
      ))}
    </dl>
  )
}
