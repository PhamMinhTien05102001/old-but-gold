import type { ChartRange, ChartTimeFilter, PricePoint } from '../types'
import { pointTimeMs } from './normalize'

const MS: Record<Exclude<ChartRange, 'All'>, number> = {
  '1D': 24 * 60 * 60 * 1000,
  '7D': 7 * 24 * 60 * 60 * 1000,
  '30D': 30 * 24 * 60 * 60 * 1000,
  '3M': 90 * 24 * 60 * 60 * 1000,
}

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function todayYmd(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function normalizeYmd(raw?: string | null): string | null {
  if (!raw) return null
  const s = raw.trim()
  return YMD_RE.test(s) ? s : null
}

/** Clamp YYYY-MM-DD to today or earlier (local calendar). */
export function clampYmdToToday(yyyyMmDd: string, now = new Date()): string {
  const today = todayYmd(now)
  return yyyyMmDd > today ? today : yyyyMmDd
}

/** Local-midnight start/end for a YYYY-MM-DD calendar day (same TZ as sourceUpdatedAtToMs). */
export function dayBounds(yyyyMmDd: string): { fromMs: number; toMs: number } | null {
  const m = yyyyMmDd.match(YMD_RE)
  if (!m) return null
  const y = +m[1]
  const mo = +m[2]
  const d = +m[3]
  const fromMs = new Date(y, mo - 1, d, 0, 0, 0, 0).getTime()
  const toMs = new Date(y, mo - 1, d, 23, 59, 59, 999).getTime()
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return null
  return { fromMs, toMs }
}

/**
 * Resolve inclusive [fromMs, toMs] for day/range filters.
 * Range: only `from` → start-of-day through now; only `to` → open start (first data)
 * through end-of-to (`fromMs: null`); both → inclusive A→B (swap if needed).
 * Dates after today are clamped.
 */
export function resolveFromToMs(
  filter: Extract<ChartTimeFilter, { mode: 'day' | 'range' }>,
  now = Date.now(),
): { fromMs: number | null; toMs: number } | null {
  if (filter.mode === 'day') {
    const day = clampYmdToToday(filter.day, new Date(now))
    return dayBounds(day)
  }

  let from = normalizeYmd(filter.from)
  let to = normalizeYmd(filter.to)
  if (from) from = clampYmdToToday(from, new Date(now))
  if (to) to = clampYmdToToday(to, new Date(now))

  if (!from && !to) return null

  if (from && to) {
    const a = dayBounds(from)
    const b = dayBounds(to)
    if (!a || !b) return null
    if (a.fromMs <= b.fromMs) return { fromMs: a.fromMs, toMs: b.toMs }
    return { fromMs: b.fromMs, toMs: a.toMs }
  }

  if (from) {
    const a = dayBounds(from)
    if (!a) return null
    return { fromMs: a.fromMs, toMs: now }
  }

  // only `to` — open start: keep every point up to end of that day
  const b = dayBounds(to!)
  if (!b) return null
  return { fromMs: null, toMs: b.toMs }
}

export function filterByRange(points: PricePoint[], range: ChartRange): PricePoint[] {
  if (range === 'All') return points
  const cutoff = Date.now() - MS[range]
  return points.filter((p) => pointTimeMs(p) >= cutoff)
}

function filterByWindow(
  points: PricePoint[],
  fromMs: number | null,
  toMs: number,
): PricePoint[] {
  return points.filter((p) => {
    const t = pointTimeMs(p)
    if (fromMs != null && t < fromMs) return false
    return t <= toMs
  })
}

export function earliestPointMs(points: PricePoint[]): number | undefined {
  let min = Number.POSITIVE_INFINITY
  for (const p of points) {
    const t = pointTimeMs(p)
    if (t < min) min = t
  }
  return Number.isFinite(min) ? min : undefined
}

export function filterHistory(
  history: PricePoint[],
  filter: ChartTimeFilter,
  kinds?: PricePoint['kind'][],
): PricePoint[] {
  let points: PricePoint[]
  if (filter.mode === 'preset') {
    points = filterByRange(history, filter.range)
  } else {
    const bounds = resolveFromToMs(filter)
    points = bounds ? filterByWindow(history, bounds.fromMs, bounds.toMs) : []
  }
  if (kinds?.length) {
    points = points.filter((p) => kinds.includes(p.kind))
  }
  return points
}

/** Short label for UI (cards, custom chip). */
export function formatTimeFilterLabel(filter: ChartTimeFilter): string {
  if (filter.mode === 'preset') return filter.range
  if (filter.mode === 'day') return formatYmdVi(filter.day)

  const fromRaw = normalizeYmd(filter.from)
  const toRaw = normalizeYmd(filter.to)
  if (!fromRaw && !toRaw) return 'Khoảng'
  if (fromRaw && !toRaw) return `${formatYmdVi(fromRaw)}→nay`
  if (!fromRaw && toRaw) return `→${formatYmdVi(toRaw)}`
  if (fromRaw === toRaw) return formatYmdVi(fromRaw!)

  const fromParts = fromRaw!.match(YMD_RE)
  const toParts = toRaw!.match(YMD_RE)
  if (fromParts && toParts && fromParts[1] === toParts[1]) {
    return `${fromParts[3]}/${fromParts[2]}–${toParts[3]}/${toParts[2]}/${toParts[1]}`
  }
  return `${formatYmdVi(fromRaw!)}–${formatYmdVi(toRaw!)}`
}

function formatYmdVi(yyyyMmDd: string): string {
  const m = yyyyMmDd.match(YMD_RE)
  if (!m) return yyyyMmDd
  return `${m[3]}/${m[2]}/${m[1]}`
}

/**
 * Previous history sample for `kind`.
 * - Without `current`: immediate predecessor of the tip (any price).
 * - With `current`: last sample whose buy/sell differs (for sell delta only).
 */
export function previousPoint(
  history: PricePoint[],
  kind: PricePoint['kind'],
  current?: Pick<PricePoint, 'buy' | 'sell'>,
): PricePoint | undefined {
  const matched = history.filter((p) => p.kind === kind)
  if (!matched.length) return undefined

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
