import type { ChartRange, GoldKind, PricePoint, StoreSnapshot } from '../types'
import { normalizeSourceUpdatedAt } from './normalize'

const MS: Record<Exclude<ChartRange, 'All'>, number> = {
  '1D': 24 * 60 * 60 * 1000,
  '7D': 7 * 24 * 60 * 60 * 1000,
  '30D': 30 * 24 * 60 * 60 * 1000,
  '3M': 90 * 24 * 60 * 60 * 1000,
}

export function filterByRange<T extends { ts: number }>(
  points: T[],
  range: ChartRange,
): T[] {
  if (range === 'All') return points
  const cutoff = Date.now() - MS[range]
  return points.filter((p) => p.ts >= cutoff)
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


const STORAGE_KEY = 'gold-price-history-v1'
const STORAGE_KEY_TEST = 'gold-price-history-test-v1'

const TRACKED_KINDS = new Set<GoldKind>(['hkn_nhan_9999', 'kkvh_9999'])

function storageKey(): string {
  return import.meta.env.VITE_USE_TEST_DATA === 'true'
    ? STORAGE_KEY_TEST
    : STORAGE_KEY
}

function isTrackedPoint(p: PricePoint): boolean {
  return TRACKED_KINDS.has(p.kind)
}

export function loadHistory(): PricePoint[] {
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return []
    const parsed = JSON.parse(raw) as PricePoint[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isTrackedPoint)
  } catch {
    return []
  }
}

export function saveHistory(points: PricePoint[]): void {
  localStorage.setItem(storageKey(), JSON.stringify(points))
}
function sameMinute(a: number, b: number): boolean {
  return Math.floor(a / 60_000) === Math.floor(b / 60_000)
}

function pointKey(p: PricePoint): string {
  return `${p.kind}|${p.ts}|${p.buy}|${p.sell}`
}

/** Merge remote (Actions) history with localStorage, sorted + deduped. */
export function mergeHistories(...lists: PricePoint[][]): PricePoint[] {
  const map = new Map<string, PricePoint>()
  for (const list of lists) {
    for (const p of list) {
      if (!isTrackedPoint(p)) continue
      map.set(pointKey(p), p)
    }
  }
  return Array.from(map.values()).sort((a, b) => a.ts - b.ts)
}

/** Append snapshot rows; skip if identical buy/sell already recorded in the same minute. */
export function appendSnapshots(snapshots: StoreSnapshot[]): PricePoint[] {
  const history = loadHistory()
  const now = Date.now()
  const additions: PricePoint[] = []

  for (const snap of snapshots) {
    for (const row of snap.rows) {
      const last = [...history, ...additions].filter((p) => p.kind === row.kind).at(-1)

      if (
        last &&
        last.buy === row.buy &&
        last.sell === row.sell &&
        sameMinute(last.ts, now)
      ) {
        continue
      }

      additions.push({
        ts: now,
        store: snap.store,
        kind: row.kind,
        label: row.label,
        buy: row.buy,
        sell: row.sell,
        sourceUpdatedAt: normalizeSourceUpdatedAt(snap.sourceUpdatedAt),
      })
    }
  }

  const next = [...history, ...additions]
  saveHistory(next)
  return next
}

export function clearHistory(): void {
  localStorage.removeItem(storageKey())
}

export function previousPoint(
  history: PricePoint[],
  kind: PricePoint['kind'],
): PricePoint | undefined {
  const matched = history.filter((p) => p.kind === kind)
  return matched.length >= 2 ? matched[matched.length - 2] : undefined
}

export function latestPoint(
  history: PricePoint[],
  kind: PricePoint['kind'],
): PricePoint | undefined {
  return history.filter((p) => p.kind === kind).at(-1)
}
