import { describe, expect, test } from 'bun:test'
import { baseDamage, battler, effectiveness, formOf, hpAt, party, simulate, statAt } from '../src/core/battle.ts'
import type { BoxLine, Game, Pokemon } from '../src/core/types.ts'
import gamesFile from '../public/games.json'
import dex from '../src/data/pokemon.json'

const mon = (name: string) => (dex as Pokemon[]).find((p) => p.name === name)!
const line = (id: string, minutes: number, gameScore = 10): BoxLine => ({ id, name: id, minutes, pts: 20, trb: 5, ast: 5, gameScore })

describe('type chart', () => {
  test('stacks across dual types and handles immunities', () => {
    expect(effectiveness('fire', ['grass', 'steel'])).toBe(4)
    expect(effectiveness('water', ['water', 'dragon'])).toBe(0.25)
    expect(effectiveness('electric', ['water', 'ground'])).toBe(0)
    expect(effectiveness('normal', ['fire'])).toBe(1)
  })
})

describe('stats and form', () => {
  test('level-50 stats follow the Gen III+ formulas', () => {
    expect(hpAt(100)).toBe(175)
    expect(statAt(100)).toBe(120)
  })

  test('a big real night hits harder, within limits', () => {
    expect(formOf(0)).toBe(1)
    expect(formOf(20)).toBeCloseTo(1.3)
    expect(formOf(60)).toBe(1.35)
    expect(formOf(-30)).toBe(0.85)
    const hot = battler('home', mon('Garchomp'), line('a', 30, 25))
    const cold = battler('home', mon('Garchomp'), line('b', 30, 0))
    const target = battler('away', mon('Snorlax'), line('c', 30))
    expect(baseDamage(hot, target, hot.moves[0])).toBeGreaterThan(baseDamage(cold, target, cold.moves[0]))
  })
})

describe('parties', () => {
  test('field the six heaviest-minute players who have a Pokémon', () => {
    const box = [line('a', 10), line('b', 38), line('rookie', 36), line('c', 30), line('d', 25), line('e', 20), line('f', 15), line('g', 12)]
    const picked = party(box, (id) => (id === 'rookie' ? undefined : mon('Pikachu')))
    expect(picked.map(([l]) => l.id)).toEqual(['b', 'c', 'd', 'e', 'f', 'g'])
  })
})

describe('simulate', () => {
  const games = gamesFile.games as Game[]
  const of = () => mon('Pikachu')
  const varied = (id: string) => (dex as Pokemon[])[id.length * 37 % 493]

  test('replays the same battle every time for the same game', () => {
    expect(JSON.stringify(simulate(games[0], varied))).toBe(JSON.stringify(simulate(games[0], varied)))
  })

  test('ends with the loser out of Pokémon and the winner still standing', () => {
    for (const game of games) {
      const b = simulate(game, varied)!
      const loser = b.winner === 'home' ? b.away : b.home
      const winner = b[b.winner]
      expect(winner.some((x) => x.hp > 0)).toBe(true)
      if (b.turns < 400) expect(loser.every((x) => x.hp <= 0)).toBe(true)
    }
  })

  test('every faint follows a hit that took the Pokémon to zero', () => {
    const b = simulate(games[0], of)!
    b.events.forEach((e, i) => {
      if (e.kind === 'faint') {
        const hit = b.events[i - 1]
        expect(hit.kind === 'move' && hit.hp <= 0).toBe(true)
      }
    })
  })

  test('every played game so far produces a battle', () => {
    expect(games.length).toBeGreaterThan(0)
    for (const game of games) expect(simulate(game, of)).not.toBeNull()
  })
})
