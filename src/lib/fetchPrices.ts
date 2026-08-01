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

async function fetchHtml(path: string): Promise<string> {
  const res = await fetch(path, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Không tải được dữ liệu (${res.status}) từ ${path}`)
  }
  return res.text()
}

function normalizeSnapshot(snap: StoreSnapshot | null): StoreSnapshot | null {
  if (!snap) return null
  return {
    ...snap,
    sourceUpdatedAt: normalizeSourceUpdatedAt(snap.sourceUpdatedAt),
  }
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

  if (!hkn?.rows?.length && !kkvh?.rows?.length && !hn?.rows?.length) {
    const hint = useTestData()
      ? 'Tạo public/data-test/latest/{hkn,kkvh,hn}.json và history/{hkn,kkvh,hn}/history.json.'
      : 'Chạy workflow "Scrape gold prices" trên GitHub Actions.'
    throw new Error(`Chưa có dữ liệu giá. ${hint}`)
  }

  return {
    fetchedAt:
      Math.max(hkn?.fetchedAt ?? 0, kkvh?.fetchedAt ?? 0, hn?.fetchedAt ?? 0) ||
      Date.now(),
    hkn: hkn ?? emptySnapshot('hkn'),
    kkvh: kkvh ?? emptySnapshot('kkvh'),
    hn: hn ?? emptySnapshot('hn'),
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
        p.kind === 'hkn_nhan_9999' ||
        p.kind === 'kkvh_9999' ||
        p.kind === 'hn_nhan_9999',
    )
    .map(normalizeHistoryPoint)

  return merged.sort((a, b) => a.ts - b.ts)
}

export async function fetchHknSnapshot(): Promise<StoreSnapshot> {
  const html = await fetchHtml('/proxy/hkn')
  const snap = parseHkn(html)
  if (!snap.rows.length) {
    throw new Error('Không tìm thấy dòng vàng 9999 trên Hoa Kim Nguyên')
  }
  return snap
}

export async function fetchKkvhSnapshot(): Promise<StoreSnapshot> {
  const html = await fetchHtml('/proxy/kkvh')
  const snap = parseKkvh(html)
  if (!snap.rows.length) {
    throw new Error('Không tìm thấy dòng Vàng 999.9 trên Kim Khánh Việt Hùng')
  }
  return snap
}

export async function fetchHnSnapshot(): Promise<StoreSnapshot> {
  const html = await fetchHtml('/proxy/hn')
  const snap = parseHn(html)
  if (!snap.rows.length) {
    throw new Error('Không tìm thấy dòng Vàng Nhẫn 9999 trên Hồng Ngọc')
  }
  return snap
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
