import { parseHkn } from './parseHkn'
import { parseKkvh } from './parseKkvh'
import { parseHn } from './parseHn'
import { normalizeSourceUpdatedAt, pointTimeMs } from './normalize'
import type { StoreHealth } from './stores'
import type { PricePoint, StoreId, StoreSnapshot } from '../types'

export type SnapshotsPayload = {
  fetchedAt: number
  hkn: StoreSnapshot
  kkvh: StoreSnapshot
  hn: StoreSnapshot
}

/** @deprecated Use SnapshotsPayload */
export type LatestPayload = SnapshotsPayload

export type StoreStatusMap = Record<StoreId, StoreHealth>

export type SnapshotSource = 'proxy' | 'json' | 'test'

const DEFAULT_STATUS: StoreStatusMap = {
  hkn: 'ok',
  kkvh: 'ok',
  hn: 'ok',
}

/** `VITE_USE_TEST_DATA=true` trong `.env` → đọc `public/data-test/`. */
export function useTestData(): boolean {
  return import.meta.env.VITE_USE_TEST_DATA === 'true'
}

function dataRoot(): string {
  const base = import.meta.env.BASE_URL || '/'
  const folder = useTestData() ? 'data-test' : 'data'
  return `${base}${folder}`
}

function dataUrl(relPath: string): string {
  return `${dataRoot()}/${relPath}`
}

async function fetchJson<T>(relPath: string): Promise<T | null> {
  try {
    const res = await fetch(dataUrl(relPath), { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

function emptySnapshot(store: StoreId): StoreSnapshot {
  return { store, fetchedAt: 0, rows: [] }
}

function hasValidRows(snap: StoreSnapshot | null | undefined): snap is StoreSnapshot {
  return Boolean(snap?.rows?.some((r) => r.buy > 0 && r.sell > 0))
}

function withValidRowsOnly(snap: StoreSnapshot): StoreSnapshot {
  return {
    ...snap,
    rows: snap.rows.filter((r) => r.buy > 0 && r.sell > 0),
  }
}

async function fetchHtml(path: string): Promise<string> {
  const res = await fetch(path, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Không tải được dữ liệu (${res.status}) từ ${path}`)
  }
  return res.text()
}

function normalizeHistoryPoint(p: PricePoint): PricePoint {
  return {
    ...p,
    sourceUpdatedAt: normalizeSourceUpdatedAt(p.sourceUpdatedAt),
  }
}

type ScheduleFile = {
  stores?: Record<
    string,
    { status?: string; rows?: number; error?: string }
  >
  storeStatus?: { store: string; status: string; rows?: number }[]
}

async function fetchScheduleStatus(): Promise<StoreStatusMap> {
  const schedule = await fetchJson<ScheduleFile>('schedule.json')
  const map: StoreStatusMap = { ...DEFAULT_STATUS }

  const apply = (store: string, status: string | undefined) => {
    if (store !== 'hkn' && store !== 'kkvh' && store !== 'hn') return
    if (status === 'ok' || status === 'fallback' || status === 'failed') {
      map[store] = status
    }
  }

  if (schedule?.stores) {
    for (const [id, st] of Object.entries(schedule.stores)) {
      apply(id, st?.status)
    }
  }
  for (const entry of schedule?.storeStatus ?? []) {
    apply(entry.store, entry.status)
  }
  return map
}

function snapshotFromStoreHistory(
  store: StoreId,
  history: PricePoint[],
): StoreSnapshot {
  const points = history.filter((p) => p.store === store)
  if (!points.length) return emptySnapshot(store)

  const bestByKind = new Map<PricePoint['kind'], PricePoint>()
  for (const p of points) {
    const prev = bestByKind.get(p.kind)
    if (!prev) {
      bestByKind.set(p.kind, p)
      continue
    }
    const t = pointTimeMs(p)
    const pt = pointTimeMs(prev)
    if (t > pt || (t === pt && p.ts >= prev.ts)) bestByKind.set(p.kind, p)
  }

  const rows = [...bestByKind.values()].map((p) => ({
    kind: p.kind,
    label: p.label,
    buy: p.buy,
    sell: p.sell,
  }))

  let fetchedAt = 0
  let bestSrcMs = -1
  let sourceUpdatedAt: string | undefined
  for (const p of bestByKind.values()) {
    fetchedAt = Math.max(fetchedAt, p.ts)
    const srcMs = pointTimeMs(p)
    if (srcMs >= bestSrcMs) {
      bestSrcMs = srcMs
      sourceUpdatedAt = p.sourceUpdatedAt
    }
  }

  return withValidRowsOnly({
    store,
    sourceUpdatedAt,
    fetchedAt,
    rows,
  })
}

/** Build current store snapshots from the tip of history (no latest/ files). */
export function snapshotsFromHistory(history: PricePoint[]): SnapshotsPayload {
  const hkn = snapshotFromStoreHistory('hkn', history)
  const kkvh = snapshotFromStoreHistory('kkvh', history)
  const hn = snapshotFromStoreHistory('hn', history)

  if (!hasValidRows(hkn) && !hasValidRows(kkvh) && !hasValidRows(hn)) {
    const hint = useTestData()
      ? 'Tạo public/data-test/history/{hkn,kkvh,hn}/history.json.'
      : 'Chạy workflow "Scrape gold prices" trên GitHub Actions.'
    throw new Error(`Chưa có dữ liệu giá. ${hint}`)
  }

  return {
    fetchedAt:
      Math.max(hkn.fetchedAt, kkvh.fetchedAt, hn.fetchedAt) || Date.now(),
    hkn: hasValidRows(hkn) ? hkn : emptySnapshot('hkn'),
    kkvh: hasValidRows(kkvh) ? kkvh : emptySnapshot('kkvh'),
    hn: hasValidRows(hn) ? hn : emptySnapshot('hn'),
  }
}

/** history/{hkn,kkvh,hn}/history.json */
export async function fetchRemoteHistory(): Promise<PricePoint[]> {
  const [hkn, kkvh, hn] = await Promise.all([
    fetchJson<PricePoint[]>('history/hkn/history.json'),
    fetchJson<PricePoint[]>('history/kkvh/history.json'),
    fetchJson<PricePoint[]>('history/hn/history.json'),
  ])

  const merged = [
    ...(Array.isArray(hkn) ? hkn : []),
    ...(Array.isArray(kkvh) ? kkvh : []),
    ...(Array.isArray(hn) ? hn : []),
  ]
    .filter(
      (p) =>
        (p.kind === 'hkn_nhan_9999' ||
          p.kind === 'kkvh_9999' ||
          p.kind === 'hn_nhan_9999') &&
        p.buy > 0 &&
        p.sell > 0,
    )
    .map(normalizeHistoryPoint)

  return merged.sort((a, b) => pointTimeMs(a) - pointTimeMs(b))
}

async function fetchProxySnapshot(
  store: StoreId,
  path: string,
  parse: (html: string) => StoreSnapshot,
  label: string,
  history: PricePoint[],
): Promise<{ snap: StoreSnapshot; status: StoreHealth }> {
  try {
    const html = await fetchHtml(path)
    const snap = withValidRowsOnly(parse(html))
    if (hasValidRows(snap)) return { snap, status: 'ok' }
    console.warn(`[${store}] ${label}: empty prices, falling back to history`)
  } catch (e) {
    console.warn(
      `[${store}] ${label}:`,
      e instanceof Error ? e.message : e,
      '— falling back to history',
    )
  }

  const fromHistory = snapshotFromStoreHistory(store, history)
  if (hasValidRows(fromHistory)) return { snap: fromHistory, status: 'fallback' }
  return { snap: emptySnapshot(store), status: 'failed' }
}

/**
 * Dev proxy | Dev test fixtures | Production from history tip.
 * Pass `history` to avoid a second network fetch (recommended from context).
 */
export async function fetchAllSnapshots(history?: PricePoint[]): Promise<{
  hkn: StoreSnapshot
  kkvh: StoreSnapshot
  hn: StoreSnapshot
  fetchedAt: number
  source: SnapshotSource
  storeStatus: StoreStatusMap
}> {
  const hist = history ?? (await fetchRemoteHistory())

  if (useTestData()) {
    const [snaps, storeStatus] = await Promise.all([
      Promise.resolve(snapshotsFromHistory(hist)),
      fetchScheduleStatus(),
    ])
    return {
      hkn: snaps.hkn,
      kkvh: snaps.kkvh,
      hn: snaps.hn,
      fetchedAt: snaps.fetchedAt,
      source: 'test',
      storeStatus,
    }
  }

  if (import.meta.env.DEV) {
    const [hknRes, kkvhRes, hnRes] = await Promise.all([
      fetchProxySnapshot('hkn', '/proxy/hkn', parseHkn, 'Hoa Kim Nguyên', hist),
      fetchProxySnapshot('kkvh', '/proxy/kkvh', parseKkvh, 'Kim Khánh Việt Hùng', hist),
      fetchProxySnapshot('hn', '/proxy/hn', parseHn, 'Hồng Ngọc', hist),
    ])
    if (
      !hasValidRows(hknRes.snap) &&
      !hasValidRows(kkvhRes.snap) &&
      !hasValidRows(hnRes.snap)
    ) {
      throw new Error('Không lấy được giá từ proxy và không có history fallback')
    }
    return {
      hkn: hknRes.snap,
      kkvh: kkvhRes.snap,
      hn: hnRes.snap,
      fetchedAt: Date.now(),
      source: 'proxy',
      storeStatus: {
        hkn: hknRes.status,
        kkvh: kkvhRes.status,
        hn: hnRes.status,
      },
    }
  }

  const [snaps, storeStatus] = await Promise.all([
    Promise.resolve(snapshotsFromHistory(hist)),
    fetchScheduleStatus(),
  ])
  return {
    hkn: snaps.hkn,
    kkvh: snaps.kkvh,
    hn: snaps.hn,
    fetchedAt: snaps.fetchedAt,
    source: 'json',
    storeStatus,
  }
}
