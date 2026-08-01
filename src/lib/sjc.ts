import type { ChartRange, PricePoint, SjcPoint } from '../types'

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

/** SJC CSV: timestamp,buy_1l,sell_1l (million VND per lượng). Convert to VND/chỉ (1 lượng = 10 chỉ). */
export function parseSjcCsv(csv: string): SjcPoint[] {
  const lines = csv.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const header = lines[0].toLowerCase()
  const cols = header.split(',').map((c) => c.trim())
  const dateIdx = cols.findIndex((c) => c.includes('timestamp') || c.includes('date'))
  const buyIdx = cols.findIndex((c) => c.includes('buy'))
  const sellIdx = cols.findIndex((c) => c.includes('sell'))

  if (dateIdx < 0 || buyIdx < 0 || sellIdx < 0) return []

  const points: SjcPoint[] = []

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',')
    if (parts.length < 3) continue
    const date = parts[dateIdx]?.trim()
    const buyMil = Number(parts[buyIdx])
    const sellMil = Number(parts[sellIdx])
    if (!date || Number.isNaN(buyMil) || Number.isNaN(sellMil)) continue

    const ts = Date.parse(date)
    if (Number.isNaN(ts)) continue

    // million VND / lượng → VND / chỉ
    points.push({
      date,
      ts,
      buy: Math.round(buyMil * 1_000_000 / 10),
      sell: Math.round(sellMil * 1_000_000 / 10),
    })
  }

  return points.sort((a, b) => a.ts - b.ts)
}

export async function fetchSjcHistory(): Promise<SjcPoint[]> {
  const res = await fetch('/proxy/sjc-csv', { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Không tải được lịch sử SJC (${res.status})`)
  }
  const csv = await res.text()
  return parseSjcCsv(csv)
}
