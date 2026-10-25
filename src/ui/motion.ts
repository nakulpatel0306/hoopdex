import { useEffect, useState } from 'react'

export const prefersStill = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Counts up from 0 to `target`, easing out, so a score lands like it's being tallied. */
export function useCountUp(target: number, ms = 900): number {
  const [value, setValue] = useState(() => (prefersStill() ? target : 0))
  useEffect(() => {
    if (prefersStill()) return setValue(target)
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      setValue(Math.round(target * (1 - (1 - t) ** 3)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, ms])
  return value
}
