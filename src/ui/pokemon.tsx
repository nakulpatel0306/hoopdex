import type { Pokemon, PokemonType } from '../core/types'

// Platinum's DS sprites, to match the gen 1-4 cutoff
export const spriteUrl = (id: number, back = false) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iv/platinum/${back ? 'back/' : ''}${id}.png`

// `back` is the view of your own Pokémon in a battle. `eager` is for sprites that get re-created
// mid-animation, which would otherwise start blank while a lazy image waits to load.
export function Sprite({ pokemon, size = 80, back = false, eager = false }: { pokemon: Pokemon; size?: number; back?: boolean; eager?: boolean }) {
  return (
    <img
      className="sprite"
      src={spriteUrl(pokemon.id, back)}
      alt={pokemon.name}
      width={size}
      height={size}
      loading={eager ? 'eager' : 'lazy'}
      decoding={eager ? 'sync' : 'async'}
    />
  )
}

const TYPE_COLORS: Record<PokemonType, string> = {
  normal: '#9a9a6c',
  fire: '#e5672b',
  water: '#4f7fe0',
  electric: '#e8bd1c',
  grass: '#5fa83f',
  ice: '#6cc4c4',
  fighting: '#b0302a',
  poison: '#93409a',
  ground: '#c9a252',
  flying: '#9184e0',
  psychic: '#e9507c',
  bug: '#97a51f',
  rock: '#ad9534',
  ghost: '#6a5594',
  dragon: '#6639e8',
  dark: '#66503f',
  steel: '#9d9db8',
  fairy: '#e08fb0',
}

export function Types({ types }: { types: PokemonType[] }) {
  return (
    <span className="types">
      {types.map((t) => (
        <span key={t} className="type" style={{ background: TYPE_COLORS[t] }}>
          {t}
        </span>
      ))}
    </span>
  )
}

export const dexNo = (id: number) => `#${String(id).padStart(3, '0')}`
