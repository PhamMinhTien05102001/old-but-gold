import type { ChartRange, PricePoint } from '../types'
import { pointTimeMs } from './normalize'

const MS: Record<Exclude<ChartRange, 'All'>, number> = {
  '1D': 24 * 60 * 60 * 1000,
  '7D': 7 * 24 * 60 * 60 * 1000,
  '30D': 30 * 24 * 60 * 60 * 1000,
  '3M': 90 * 24 * 60 * 60 * 1000,
}

export function filterByRange(points: PricePoint[], range: ChartRange): PricePoint[] {
  if (range === 'All') return points
  const cutoff = Date.now() - MS[range]
  return points.filter((p) => pointTimeMs(p) >= cutoff)
}

export function filterHistory(
  history: PricePoint[],
  range: ChartRange,
  kinds?: PricePoint['kind'][],
): PricePoint[] {
  let points = filterByRange(history, range)
  if (kinds?.length) {
    points = points.filter((p) => kinds.includes(p.kind))
  }
  return points
}

export function previousPoint(
  history: PricePoint[],
  kind: PricePoint['kind'],
  current?: Pick<PricePoint, 'buy' | 'sell'>,
): PricePoint | undefined {
  const matched = history.filter((p) => p.kind === kind)
  if (!matched.length) return undefined

  // Prefer last point whose buy/sell differs from current (skip plateau duplicates).
  if (current) {
    for (let i = matched.length - 1; i >= 0; i--) {
      const p = matched[i]
      if (p.buy !== current.buy || p.sell !== current.sell) return p
    }
    return undefined
  }

  return matched.length >= 2 ? matched[matched.length - 2] : undefined
}

export function latestPoint(
  history: PricePoint[],
  kind: PricePoint['kind'],
): PricePoint | undefined {
  return history.filter((p) => p.kind === kind).at(-1)
}
