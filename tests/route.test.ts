import { describe, expect, test } from 'bun:test'
import { href, parse, type Route } from '../src/ui/route'

describe('routes', () => {
  test('the bare site opens the landing page', () => {
    expect(parse('')).toEqual({ view: 'home' })
    expect(parse('#/')).toEqual({ view: 'home' })
    expect(parse('#/nonsense')).toEqual({ view: 'home' })
  })

  test('player links from before the landing page still open the player', () => {
    expect(parse('#/player/curryst01')).toEqual({ view: 'players', id: 'curryst01' })
  })

  test('every route survives a round trip through its link', () => {
    const routes: Route[] = [
      { view: 'home' },
      { view: 'players' },
      { view: 'players', id: 'jokicni01' },
      { view: 'teams' },
      { view: 'teams', team: 'GSW' },
      { view: 'games' },
      { view: 'games', id: '202610220OKC' },
      { view: 'dex' },
      { view: 'dex', id: 386 },
      { view: 'how' },
    ]
    for (const r of routes) expect(parse(href(r))).toEqual(r)
  })
})
