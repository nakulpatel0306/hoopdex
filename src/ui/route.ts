import { useSyncExternalStore } from 'react'

// Hash routes keep deep links working on GitHub Pages, which has no server-side rewrites:
// #/, #/players, #/player/<id>, #/teams, #/team/<abbr>, #/games, #/game/<id>, #/dex, #/dex/<id>, #/how
export type Route =
  | { view: 'home' }
  | { view: 'players'; id?: string }
  | { view: 'teams'; team?: string }
  | { view: 'games'; id?: string }
  | { view: 'dex'; id?: number }
  | { view: 'how' }

export function parse(hash: string): Route {
  const [view, arg] = hash.replace(/^#\/?/, '').split('/')
  if (view === 'players') return { view: 'players' }
  if (view === 'player') return { view: 'players', id: arg || undefined }
  if (view === 'teams' || view === 'team') return { view: 'teams', team: arg || undefined }
  if (view === 'games' || view === 'game') return { view: 'games', id: arg || undefined }
  if (view === 'dex') return { view: 'dex', id: arg ? Number(arg) : undefined }
  if (view === 'how') return { view: 'how' }
  return { view: 'home' }
}

export const href = (route: Route): string => {
  switch (route.view) {
    case 'home':
      return '#/'
    case 'players':
      return route.id ? `#/player/${route.id}` : '#/players'
    case 'teams':
      return route.team ? `#/team/${route.team}` : '#/teams'
    case 'games':
      return route.id ? `#/game/${route.id}` : '#/games'
    case 'dex':
      return route.id ? `#/dex/${route.id}` : '#/dex'
    case 'how':
      return '#/how'
  }
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useRoute(): Route {
  return parse(useSyncExternalStore(subscribe, () => window.location.hash))
}
