// Mid-rank percentile: ties share the average of the ranks they span, so a value equal to
// everything scores 50 rather than 0 or 100.
export function percentiles(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  return values.map((v) => {
    let below = 0
    let equal = 0
    for (const s of sorted) {
      if (s < v) below++
      else if (s === v) equal++
      else break
    }
    return (100 * (below + equal / 2)) / values.length
  })
}

// Averages several metrics' percentiles, weighted, then ranks that average, so a composite
// still spreads evenly from 0 to 100 like a single metric does
export function composite(columns: number[][], weights: number[] = columns.map(() => 1)): number[] {
  const ranked = columns.map(percentiles)
  const total = weights.reduce((a, b) => a + b, 0)
  const mean = ranked[0].map((_, i) => ranked.reduce((sum, col, c) => sum + weights[c] * col[i], 0) / total)
  return percentiles(mean)
}
