import { parseHkn } from './parseHkn'
import { parseKkvh } from './parseKkvh'
import { parseHn } from './parseHn'
import { normalizeSourceUpdatedAt } from './normalize'
import type { PricePoint, StoreId, StoreSnapshot } from '../types'

export type LatestPayload = {
  fetchedAt: number
  hkn: StoreSnapshot
  kkvh: StoreSnapshot
  hn: StoreSnapshot
}

export type SnapshotSource = 'proxy' | 'json' | 'test'

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

function normalizeSnapshot(snap: StoreSnapshot | null): StoreSnapshot | null {
  if (!snap) return null
  return withValidRowsOnly({
    ...snap,
    sourceUpdatedAt: normalizeSourceUpdatedAt(snap.sourceUpdatedAt),
  })
}

function normalizeHistoryPoint(p: PricePoint): PricePoint {
  return {
    ...p,
    sourceUpdatedAt: normalizeSourceUpdatedAt(p.sourceUpdatedAt),
  }
}

/** latest/{hkn,kkvh,hn}.json */
export async function fetchLatestFromJson(): Promise<LatestPayload> {
  const [hknRaw, kkvhRaw, hnRaw] = await Promise.all([
    fetchJson<StoreSnapshot>('latest/hkn.json'),
    fetchJson<StoreSnapshot>('latest/kkvh.json'),
    fetchJson<StoreSnapshot>('latest/hn.json'),
  ])
  const hkn = normalizeSnapshot(hknRaw)
  const kkvh = normalizeSnapshot(kkvhRaw)
  const hn = normalizeSnapshot(hnRaw)

  if (!hasValidRows(hkn) && !hasValidRows(kkvh) && !hasValidRows(hn)) {
    const hint = useTestData()
      ? 'Tạo public/data-test/latest/{hkn,kkvh,hn}.json và history/{hkn,kkvh,hn}/history.json.'
      : 'Chạy workflow "Scrape gold prices" trên GitHub Actions.'
    throw new Error(`Chưa có dữ liệu giá. ${hint}`)
  }

  return {
    fetchedAt:
      Math.max(hkn?.fetchedAt ?? 0, kkvh?.fetchedAt ?? 0, hn?.fetchedAt ?? 0) ||
      Date.now(),
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

  return merged.sort((a, b) => a.ts - b.ts)
}

async function fetchProxySnapshot(
  store: StoreId,
  path: string,
  parse: (html: string) => StoreSnapshot,
  label: string,
): Promise<StoreSnapshot> {
  try {
    const html = await fetchHtml(path)
    const snap = withValidRowsOnly(parse(html))
    if (hasValidRows(snap)) return snap
    console.warn(`[${store}] ${label}: empty prices, falling back to JSON`)
  } catch (e) {
    console.warn(
      `[${store}] ${label}:`,
      e instanceof Error ? e.message : e,
      '— falling back to JSON',
    )
  }

  const fromJson = normalizeSnapshot(await fetchJson<StoreSnapshot>(`latest/${store}.json`))
  if (hasValidRows(fromJson)) return fromJson
  return emptySnapshot(store)
}

export async function fetchHknSnapshot(): Promise<StoreSnapshot> {
  return fetchProxySnapshot('hkn', '/proxy/hkn', parseHkn, 'Hoa Kim Nguyên')
}

export async function fetchKkvhSnapshot(): Promise<StoreSnapshot> {
  return fetchProxySnapshot('kkvh', '/proxy/kkvh', parseKkvh, 'Kim Khánh Việt Hùng')
}

export async function fetchHnSnapshot(): Promise<StoreSnapshot> {
  return fetchProxySnapshot('hn', '/proxy/hn', parseHn, 'Hồng Ngọc')
}

/** Dev proxy | Dev test fixtures | Production JSON from Actions scrape. */
export async function fetchAllSnapshots(): Promise<{
  hkn: StoreSnapshot
  kkvh: StoreSnapshot
  hn: StoreSnapshot
  fetchedAt: number
  source: SnapshotSource
}> {
  if (useTestData()) {
    const latest = await fetchLatestFromJson()
    return {
      hkn: latest.hkn,
      kkvh: latest.kkvh,
      hn: latest.hn,
      fetchedAt: latest.fetchedAt,
      source: 'test',
    }
  }

  if (import.meta.env.DEV) {
    const [hkn, kkvh, hn] = await Promise.all([
      fetchHknSnapshot(),
      fetchKkvhSnapshot(),
      fetchHnSnapshot(),
    ])
    if (!hasValidRows(hkn) && !hasValidRows(kkvh) && !hasValidRows(hn)) {
      throw new Error('Không lấy được giá từ proxy và không có JSON fallback')
    }
    return { hkn, kkvh, hn, fetchedAt: Date.now(), source: 'proxy' }
  }

  const latest = await fetchLatestFromJson()
  return {
    hkn: latest.hkn,
    kkvh: latest.kkvh,
    hn: latest.hn,
    fetchedAt: latest.fetchedAt,
    source: 'json',
  }
}
