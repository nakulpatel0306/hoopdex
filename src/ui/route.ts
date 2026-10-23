import { useSyncExternalStore } from 'react'

// Hash routes keep deep links working on GitHub Pages, which has no server-side rewrites:
// #/player/<id>, #/teams, #/team/<abbr>, #/dex, #/dex/<id>, #/how
export type Route =
  | { view: 'players'; id?: string }
  | { view: 'teams'; team?: string }
  | { view: 'dex'; id?: number }
  | { view: 'how' }

export function parse(hash: string): Route {
  const [view, arg] = hash.replace(/^#\/?/, '').split('/')
  if (view === 'teams' || view === 'team') return { view: 'teams', team: arg }
  if (view === 'dex') return { view: 'dex', id: arg ? Number(arg) : undefined }
  if (view === 'how') return { view: 'how' }
  return { view: 'players', id: view === 'player' ? arg : undefined }
}

export const href = (route: Route): string => {
  switch (route.view) {
    case 'players':
      return route.id ? `#/player/${route.id}` : '#/'
    case 'teams':
      return route.team ? `#/team/${route.team}` : '#/teams'
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
