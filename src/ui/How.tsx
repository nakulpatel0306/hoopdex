import type { League } from '../core/league'
import { AXES, MIN_MINUTES } from '../core/profile'
import { STATS } from '../core/types'
import { STAT_NAMES } from './format'

export function How({ league }: { league: League }) {
  const qualified = league.entries.filter((e) => e.profile).length
  return (
    <article className="how">
      <h1>How a player becomes a Pokémon</h1>
      <p>
        Both sides get turned into percentiles, so a player and a Pokémon can be compared even though one is measured in
        rebound rate and the other in base stats.
      </p>

      <h2>Players are ranked against their position</h2>
      <p>
        Each of the {qualified} players with at least {MIN_MINUTES} minutes in {league.season} is ranked against the other
        guards, forwards or centers. A forward in the 67th percentile on defense defends better than two thirds of
        forwards. Centers aren't penalised for not passing like point guards, and guards aren't penalised for not
        blocking shots.
      </p>

      <h2>Each Pokémon stat stands for a basketball skill</h2>
      <table className="axes">
        <thead>
          <tr>
            <th scope="col">Stat</th>
            <th scope="col">Skill</th>
            <th scope="col">Measured by</th>
          </tr>
        </thead>
        <tbody>
          {STATS.map((s) => (
            <tr key={s}>
              <th scope="row">{STAT_NAMES[s]}</th>
              <td>{AXES[s].skill}</td>
              <td>{AXES[s].metrics.map((m) => m.label).join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        When a skill has several metrics, each is ranked on its own, the ranks are averaged, and the average is ranked
        again so it spreads evenly from 1st to 99th.
      </p>

      <h2>Pokémon are ranked against the whole Pokédex</h2>
      <p>
        All 493 Pokémon from Bulbasaur to Arceus are ranked on each base stat. Steelix's Defense of 200 is near the top;
        Chansey's 5 is at the bottom. Base stats come from PokeAPI and reflect the latest games, so a few early Pokémon
        have the stat boosts they got in Generation VI.
      </p>

      <h2>The closest Pokémon across all six stats wins</h2>
      <p>
        Every player is compared with all 493 Pokémon on HP, Attack, Defense, Sp. Atk, Sp. Def and Speed at once, and
        every stat counts the same. The Pokémon with the smallest average gap wins. Big gaps are punished more than small
        ones, so a Pokémon that's close everywhere beats one that's perfect on five stats and way off on the sixth.
      </p>
      <p>
        The fit score is 100 minus that average gap. A 90 means the two sit within about ten percentile points of each
        other on every stat.
      </p>

      <h2>Where the numbers come from</h2>
      <p>
        Player stats are the {league.season} regular season from{' '}
        <a href="https://www.basketball-reference.com/">Basketball-Reference</a>, fetched {league.fetched}. Teams are
        where each player has played in 2026-27 so far, or their last 2025-26 team. Rookies show up once they have a full
        season of minutes. Pokémon data and sprites come from <a href="https://pokeapi.co/">PokeAPI</a>.
      </p>
    </article>
  )
}
