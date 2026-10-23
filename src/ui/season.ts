import { useEffect, useState } from 'react'
import type { Game } from '../core/types'

export type Season = { season: string; updated: string; games: Game[] }

// The season's games grow all year, so they're fetched on demand rather than bundled
let loading: Promise<Season> | null = null

export function useSeason(): { season: Season | null; error: boolean } {
  const [season, setSeason] = useState<Season | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    loading ??= fetch(`${import.meta.env.BASE_URL}games.json`).then((res) => {
      if (!res.ok) throw new Error(`games.json: HTTP ${res.status}`)
      return res.json()
    })
    loading.then(setSeason, () => {
      loading = null
      setError(true)
    })
  }, [])
  return { season, error }
}
