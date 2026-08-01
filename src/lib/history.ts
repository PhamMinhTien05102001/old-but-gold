import type { GoldKind, PricePoint, StoreSnapshot } from '../types'

const STORAGE_KEY = 'gold-price-history-v1'

const TRACKED_KINDS = new Set<GoldKind>(['hkn_nhan_9999', 'kkvh_9999'])

function isTrackedPoint(p: PricePoint): boolean {
  return TRACKED_KINDS.has(p.kind)
}

export function loadHistory(): PricePoint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PricePoint[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isTrackedPoint)
  } catch {
    return []
  }
}

export function saveHistory(points: PricePoint[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(points))
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
        sourceUpdatedAt: snap.sourceUpdatedAt,
      })
    }
  }

  const next = [...history, ...additions]
  saveHistory(next)
  return next
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY)
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
