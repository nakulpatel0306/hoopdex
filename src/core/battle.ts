import type { BoxLine, Game, Pokemon, PokemonType } from './types.ts'

// A trimmed-down Gen IV singles battle between the two teams' Pokémon, seeded by the game so
// every replay plays out the same. Who plays, in what order, and how hard they hit all come
// from the real box score.

export const LEVEL = 50
const PARTY = 6
const MAX_TURNS = 400

type Move = { name: string; type: PokemonType; power: number; accuracy: number; physical: boolean }

// One physical and one special attack per type, around the power a level-50 Pokémon would carry
const MOVES: Record<PokemonType, [Move, Move]> = {
  normal: [{ name: 'Body Slam', type: 'normal', power: 85, accuracy: 100, physical: true }, { name: 'Hyper Voice', type: 'normal', power: 90, accuracy: 100, physical: false }],
  fire: [{ name: 'Fire Punch', type: 'fire', power: 75, accuracy: 100, physical: true }, { name: 'Flamethrower', type: 'fire', power: 90, accuracy: 100, physical: false }],
  water: [{ name: 'Waterfall', type: 'water', power: 80, accuracy: 100, physical: true }, { name: 'Surf', type: 'water', power: 90, accuracy: 100, physical: false }],
  electric: [{ name: 'Thunder Punch', type: 'electric', power: 75, accuracy: 100, physical: true }, { name: 'Thunderbolt', type: 'electric', power: 90, accuracy: 100, physical: false }],
  grass: [{ name: 'Seed Bomb', type: 'grass', power: 80, accuracy: 100, physical: true }, { name: 'Energy Ball', type: 'grass', power: 80, accuracy: 100, physical: false }],
  ice: [{ name: 'Ice Punch', type: 'ice', power: 75, accuracy: 100, physical: true }, { name: 'Ice Beam', type: 'ice', power: 90, accuracy: 100, physical: false }],
  fighting: [{ name: 'Brick Break', type: 'fighting', power: 75, accuracy: 100, physical: true }, { name: 'Aura Sphere', type: 'fighting', power: 80, accuracy: 100, physical: false }],
  poison: [{ name: 'Poison Jab', type: 'poison', power: 80, accuracy: 100, physical: true }, { name: 'Sludge Bomb', type: 'poison', power: 90, accuracy: 100, physical: false }],
  ground: [{ name: 'Earthquake', type: 'ground', power: 100, accuracy: 100, physical: true }, { name: 'Earth Power', type: 'ground', power: 90, accuracy: 100, physical: false }],
  flying: [{ name: 'Drill Peck', type: 'flying', power: 80, accuracy: 100, physical: true }, { name: 'Air Slash', type: 'flying', power: 75, accuracy: 95, physical: false }],
  psychic: [{ name: 'Zen Headbutt', type: 'psychic', power: 80, accuracy: 90, physical: true }, { name: 'Psychic', type: 'psychic', power: 90, accuracy: 100, physical: false }],
  bug: [{ name: 'X-Scissor', type: 'bug', power: 80, accuracy: 100, physical: true }, { name: 'Bug Buzz', type: 'bug', power: 90, accuracy: 100, physical: false }],
  rock: [{ name: 'Rock Slide', type: 'rock', power: 75, accuracy: 90, physical: true }, { name: 'Power Gem', type: 'rock', power: 80, accuracy: 100, physical: false }],
  ghost: [{ name: 'Shadow Claw', type: 'ghost', power: 70, accuracy: 100, physical: true }, { name: 'Shadow Ball', type: 'ghost', power: 80, accuracy: 100, physical: false }],
  dragon: [{ name: 'Dragon Claw', type: 'dragon', power: 80, accuracy: 100, physical: true }, { name: 'Dragon Pulse', type: 'dragon', power: 85, accuracy: 100, physical: false }],
  dark: [{ name: 'Crunch', type: 'dark', power: 80, accuracy: 100, physical: true }, { name: 'Dark Pulse', type: 'dark', power: 80, accuracy: 100, physical: false }],
  steel: [{ name: 'Iron Head', type: 'steel', power: 80, accuracy: 100, physical: true }, { name: 'Flash Cannon', type: 'steel', power: 80, accuracy: 100, physical: false }],
  fairy: [{ name: 'Play Rough', type: 'fairy', power: 90, accuracy: 90, physical: true }, { name: 'Moonblast', type: 'fairy', power: 95, accuracy: 100, physical: false }],
}

// Attacking type -> defending types it hits for 2x, 0.5x and 0x (the current 18-type chart,
// since the Pokémon carry their current types)
const CHART: Record<PokemonType, { two: PokemonType[]; half: PokemonType[]; zero: PokemonType[] }> = {
  normal: { two: [], half: ['rock', 'steel'], zero: ['ghost'] },
  fire: { two: ['grass', 'ice', 'bug', 'steel'], half: ['fire', 'water', 'rock', 'dragon'], zero: [] },
  water: { two: ['fire', 'ground', 'rock'], half: ['water', 'grass', 'dragon'], zero: [] },
  electric: { two: ['water', 'flying'], half: ['electric', 'grass', 'dragon'], zero: ['ground'] },
  grass: { two: ['water', 'ground', 'rock'], half: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'], zero: [] },
  ice: { two: ['grass', 'ground', 'flying', 'dragon'], half: ['fire', 'water', 'ice', 'steel'], zero: [] },
  fighting: { two: ['normal', 'ice', 'rock', 'dark', 'steel'], half: ['poison', 'flying', 'psychic', 'bug', 'fairy'], zero: ['ghost'] },
  poison: { two: ['grass', 'fairy'], half: ['poison', 'ground', 'rock', 'ghost'], zero: ['steel'] },
  ground: { two: ['fire', 'electric', 'poison', 'rock', 'steel'], half: ['grass', 'bug'], zero: ['flying'] },
  flying: { two: ['grass', 'fighting', 'bug'], half: ['electric', 'rock', 'steel'], zero: [] },
  psychic: { two: ['fighting', 'poison'], half: ['psychic', 'steel'], zero: ['dark'] },
  bug: { two: ['grass', 'psychic', 'dark'], half: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'], zero: [] },
  rock: { two: ['fire', 'ice', 'flying', 'bug'], half: ['fighting', 'ground', 'steel'], zero: [] },
  ghost: { two: ['psychic', 'ghost'], half: ['dark'], zero: ['normal'] },
  dragon: { two: ['dragon'], half: ['steel'], zero: ['fairy'] },
  dark: { two: ['psychic', 'ghost'], half: ['fighting', 'dark', 'fairy'], zero: [] },
  steel: { two: ['ice', 'rock', 'fairy'], half: ['fire', 'water', 'electric', 'steel'], zero: [] },
  fairy: { two: ['fighting', 'dragon', 'dark'], half: ['fire', 'poison', 'steel'], zero: [] },
}

export function effectiveness(move: PokemonType, defender: PokemonType[]): number {
  return defender.reduce((m, t) => {
    const row = CHART[move]
    return m * (row.zero.includes(t) ? 0 : row.two.includes(t) ? 2 : row.half.includes(t) ? 0.5 : 1)
  }, 1)
}

// Gen III+ stat formulas at level 50 with perfect IVs, no EVs and a neutral nature
export const hpAt = (base: number) => Math.floor(((2 * base + 31) * LEVEL) / 100) + LEVEL + 10
export const statAt = (base: number) => Math.floor(((2 * base + 31) * LEVEL) / 100) + 5

/** How hard a player's Pokémon hits, from their real Game Score that night: about +1.5% a point, capped. */
export const formOf = (gameScore: number) => Math.min(1.35, Math.max(0.85, 1 + 0.015 * gameScore))

export type Battler = {
  side: 'home' | 'away'
  pokemon: Pokemon
  player: BoxLine
  form: number
  maxHp: number
  hp: number
  attack: number
  defense: number
  spAtk: number
  spDef: number
  speed: number
  moves: Move[]
  damageDealt: number
  kos: number
}

function movesFor(p: Pokemon): Move[] {
  const physical = p.stats.attack >= p.stats.spAtk
  const pick = (t: PokemonType) => MOVES[t][physical ? 0 : 1]
  const own = p.types.map(pick)
  // A Normal move as backup, so a Pokémon is never left with only resisted options
  return p.types.includes('normal') ? own : [...own, pick('normal')]
}

export function battler(side: 'home' | 'away', pokemon: Pokemon, player: BoxLine): Battler {
  const s = pokemon.stats
  const form = formOf(player.gameScore)
  return {
    side, pokemon, player, form,
    maxHp: hpAt(s.hp), hp: hpAt(s.hp),
    attack: statAt(s.attack), defense: statAt(s.defense), spAtk: statAt(s.spAtk), spDef: statAt(s.spDef),
    speed: Math.round(statAt(s.speed) * form),
    moves: movesFor(pokemon),
    damageDealt: 0, kos: 0,
  }
}

/** Gen IV damage before the random roll and critical hits. */
export function baseDamage(attacker: Battler, defender: Battler, move: Move): number {
  const a = (move.physical ? attacker.attack : attacker.spAtk) * attacker.form
  const d = move.physical ? defender.defense : defender.spDef
  const raw = Math.floor(Math.floor((Math.floor((2 * LEVEL) / 5 + 2) * move.power * a) / d) / 50) + 2
  const stab = attacker.pokemon.types.includes(move.type) ? 1.5 : 1
  return raw * stab * effectiveness(move.type, defender.pokemon.types)
}

/** Seeded PRNG (mulberry32), so a game's battle is the same every time it's watched. */
export function rng(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
  let a = (h << 13) | (h >>> 19)
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type BattleEvent =
  | { kind: 'send'; side: 'home' | 'away'; slot: number }
  | { kind: 'move'; side: 'home' | 'away'; slot: number; turn: number; move: string; type: PokemonType; damage: number; effect: number; crit: boolean; missed: boolean; hp: number }
  | { kind: 'faint'; side: 'home' | 'away'; slot: number }

export type Battle = {
  home: Battler[]
  away: Battler[]
  events: BattleEvent[]
  winner: 'home' | 'away'
  turns: number
}

/** The players who logged the most minutes that night and have a Pokémon, up to six, most minutes first. */
export function party(box: BoxLine[], pokemonOf: (playerId: string) => Pokemon | undefined): [BoxLine, Pokemon][] {
  return [...box]
    .sort((a, b) => b.minutes - a.minutes)
    .flatMap((line) => {
      const p = pokemonOf(line.id)
      return p ? [[line, p] as [BoxLine, Pokemon]] : []
    })
    .slice(0, PARTY)
}

export function simulate(game: Game, pokemonOf: (playerId: string) => Pokemon | undefined): Battle | null {
  const teams = {
    home: party(game.home.box, pokemonOf).map(([line, p]) => battler('home', p, line)),
    away: party(game.away.box, pokemonOf).map(([line, p]) => battler('away', p, line)),
  }
  if (!teams.home.length || !teams.away.length) return null
  const random = rng(game.id)
  const slot = { home: 0, away: 0 }
  const events: BattleEvent[] = [{ kind: 'send', side: 'away', slot: 0 }, { kind: 'send', side: 'home', slot: 0 }]
  let turns = 0

  while (slot.home < teams.home.length && slot.away < teams.away.length && turns < MAX_TURNS) {
    turns++
    const h = teams.home[slot.home]
    const a = teams.away[slot.away]
    const order = h.speed === a.speed ? (random() < 0.5 ? [h, a] : [a, h]) : h.speed > a.speed ? [h, a] : [a, h]
    for (const attacker of order) {
      const defender = attacker === h ? a : h
      if (attacker.hp <= 0 || defender.hp <= 0) continue
      // Trainers pick the move that does the most on average, accuracy included
      const move = attacker.moves.reduce((best, m) => (baseDamage(attacker, defender, m) * m.accuracy > baseDamage(attacker, defender, best) * best.accuracy ? m : best))
      const missed = random() * 100 >= move.accuracy
      const crit = !missed && random() < 1 / 16
      const effect = effectiveness(move.type, defender.pokemon.types)
      const roll = 0.85 + random() * 0.15
      const damage = missed || effect === 0 ? 0 : Math.max(1, Math.min(defender.hp, Math.floor(baseDamage(attacker, defender, move) * roll * (crit ? 2 : 1))))
      defender.hp -= damage
      attacker.damageDealt += damage
      events.push({ kind: 'move', side: attacker.side, slot: slot[attacker.side], turn: turns, move: move.name, type: move.type, damage, effect, crit, missed, hp: defender.hp })
      if (defender.hp <= 0) {
        attacker.kos++
        events.push({ kind: 'faint', side: defender.side, slot: slot[defender.side] })
        slot[defender.side]++
        if (slot[defender.side] < teams[defender.side].length) events.push({ kind: 'send', side: defender.side, slot: slot[defender.side] })
        break
      }
    }
  }
  // A stalemate (two Pokémon that can't touch each other) goes to whoever has more HP left
  const left = (side: 'home' | 'away') => teams[side].reduce((sum, b) => sum + Math.max(0, b.hp) / b.maxHp, 0)
  const winner = slot.home >= teams.home.length ? 'away' : slot.away >= teams.away.length ? 'home' : left('home') >= left('away') ? 'home' : 'away'
  return { ...teams, events, winner, turns }
}
