import { useEffect, useMemo, useState } from 'react'
import type { Battle, Battler } from '../core/battle'
import { TEAMS } from '../core/teams'
import type { Game } from '../core/types'
import { Sprite, spriteUrl } from './pokemon'

type Side = 'home' | 'away'

type Step = {
  text: string
  slot: Record<Side, number>
  hp: Record<Side, number[]>
  turn: number
  // Which side's Pokémon this step animates, and how
  hit?: Side
  attacker?: Side
  fainted?: Side
  sent?: Side
  long: boolean
}

const short = (team: string) => TEAMS[team]?.split(' ').at(-1) ?? team

/** Turns the battle's events into one message per screen, with everyone's HP at that moment. */
function steps(battle: Battle, game: Game): Step[] {
  const hp: Record<Side, number[]> = { home: battle.home.map((b) => b.maxHp), away: battle.away.map((b) => b.maxHp) }
  const slot: Record<Side, number> = { home: 0, away: 0 }
  let turn = 0
  const name = (side: Side, i: number) => battle[side][i].pokemon.name.toUpperCase()
  const snap = (text: string, extra: Partial<Step> = {}): Step => ({ text, slot: { ...slot }, hp: { home: [...hp.home], away: [...hp.away] }, turn, long: false, ...extra })
  const out: Step[] = []
  for (const e of battle.events) {
    const other: Side = e.side === 'home' ? 'away' : 'home'
    if (e.kind === 'send') {
      slot[e.side] = e.slot
      out.push(snap(`The ${short(game[e.side].team)} sent out ${name(e.side, e.slot)}!`, { sent: e.side }))
    } else if (e.kind === 'move') {
      turn = e.turn
      out.push(snap(`${name(e.side, e.slot)} used ${e.move}!`, { attacker: e.side }))
      if (e.missed) {
        out.push(snap(`${name(e.side, e.slot)}'s attack missed!`))
        continue
      }
      hp[other][slot[other]] = Math.max(0, e.hp)
      const notes = [e.crit && 'A critical hit!', e.effect === 0 ? `It doesn't affect ${name(other, slot[other])}…` : e.effect > 1 ? "It's super effective!" : e.effect < 1 && "It's not very effective…"]
      out.push(snap(notes.filter(Boolean).join(' ') || `${name(other, slot[other])} took ${e.damage} damage.`, { hit: e.effect === 0 ? undefined : other, long: true }))
    } else {
      out.push(snap(`${name(e.side, e.slot)} fainted!`, { fainted: e.side }))
    }
  }
  out.push(snap(`The ${short(game[battle.winner].team)} won the battle!`))
  return out
}

const prefersStill = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export function BattleReplay({ battle, game, onFinish }: { battle: Battle; game: Game; onFinish: () => void }) {
  const timeline = useMemo(() => steps(battle, game), [battle, game])
  const [at, setAt] = useState(() => (prefersStill() ? timeline.length - 1 : 0))
  const [playing, setPlaying] = useState(() => !prefersStill())
  const [fast, setFast] = useState(false)
  const step = timeline[at]
  const done = at === timeline.length - 1

  // Load every sprite in both lineups up front, so a Pokémon sent out later appears at once
  useEffect(() => {
    for (const b of [...battle.away, ...battle.home]) new Image().src = spriteUrl(b.pokemon.id, b.side === 'home')
  }, [battle])

  useEffect(() => {
    if (done) onFinish()
  }, [done, onFinish])

  useEffect(() => {
    if (!playing || done) return
    const wait = (step.long ? 1300 : 950) / (fast ? 2.5 : 1)
    const timer = setTimeout(() => setAt((i) => i + 1), wait)
    return () => clearTimeout(timer)
  }, [playing, done, at, fast, step.long])

  return (
    <section className="replay" aria-label="Battle replay">
      <div className="field">
        <Combatant side="away" battle={battle} step={step} at={at} team={game.away.team} />
        <Combatant side="home" battle={battle} step={step} at={at} team={game.home.team} />
        <div className="textbox" aria-live="polite">
          <p key={at}>{step.text}</p>
        </div>
      </div>
      <div className="replay-controls">
        <button onClick={() => (done ? (setAt(0), setPlaying(true)) : setPlaying(!playing))}>{done ? 'Replay' : playing ? 'Pause' : 'Play'}</button>
        <button aria-pressed={fast} onClick={() => setFast(!fast)}>
          2x speed
        </button>
        <button onClick={() => (setAt(timeline.length - 1), setPlaying(false))} disabled={done}>
          Skip to the result
        </button>
        <span className="progress">
          Turn {step.turn} of {battle.turns}
        </span>
      </div>
    </section>
  )
}

function Combatant({ side, battle, step, at, team }: { side: Side; battle: Battle; step: Step; at: number; team: string }) {
  const i = step.slot[side]
  const b: Battler = battle[side][i]
  const hp = step.hp[side][i]
  const pct = (100 * hp) / b.maxHp
  const out = hp <= 0
  const fx = step.hit === side ? 'hit' : step.attacker === side ? 'lunge' : step.sent === side ? 'sent' : step.fainted === side ? 'faint' : ''
  return (
    <div className={`combatant ${side}`}>
      <div className="info">
        <div className="info-name">
          <strong>{b.pokemon.name}</strong>
          <span>Lv50</span>
        </div>
        <div className="info-player">
          {b.player.name}, {short(team)}
        </div>
        <div className="hp">
          <span>HP</span>
          <span className="hp-track">
            <i style={{ width: `${pct}%` }} className={pct > 50 ? 'good' : pct > 20 ? 'warn' : 'low'} />
          </span>
        </div>
        {side === 'home' && (
          <div className="hp-num">
            {hp}/{b.maxHp}
          </div>
        )}
        <div className="balls" aria-label={`${battle[side].filter((_, j) => step.hp[side][j] > 0).length} of ${battle[side].length} Pokémon left`}>
          {battle[side].map((_, j) => (
            <span key={j} className={step.hp[side][j] > 0 ? '' : 'used'} />
          ))}
        </div>
      </div>
      <div className={`stage-mon ${out && !fx ? 'gone' : ''}`}>
        <div className="pad" />
        <div key={`${i}-${at}-${fx}`} className={`mon-sprite ${fx}`}>
          <Sprite pokemon={b.pokemon} size={side === 'home' ? 192 : 160} back={side === 'home'} eager />
        </div>
      </div>
    </div>
  )
}
