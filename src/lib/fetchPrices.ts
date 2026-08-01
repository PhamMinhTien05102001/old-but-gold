import { parseHkn } from './parseHkn'
import { parseKkvh } from './parseKkvh'
import type { PricePoint, StoreSnapshot } from '../types'

export type LatestPayload = {
  fetchedAt: number
  hkn: StoreSnapshot
  kkvh: StoreSnapshot
}

export type SnapshotSource = 'proxy' | 'json' | 'test'

/** `VITE_USE_TEST_DATA=true` trong `.env` → đọc `public/data-test/`. */
export function useTestData(): boolean {
  return import.meta.env.VITE_USE_TEST_DATA === 'true'
}

function dataUrl(file: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const folder = useTestData() ? 'data-test' : 'data'
  return `${base}${folder}/${file}`
}

async function fetchHtml(path: string): Promise<string> {
  const res = await fetch(path, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Không tải được dữ liệu (${res.status}) từ ${path}`)
  }
  return res.text()
}

export async function fetchLatestFromJson(): Promise<LatestPayload> {
  const res = await fetch(dataUrl('latest.json'), { cache: 'no-store' })
  if (!res.ok) {
    const hint = useTestData()
      ? 'Tạo/sửa public/data-test/latest.json (và history.json).'
      : 'Chạy workflow "Scrape gold prices" trên GitHub Actions.'
    throw new Error(`Chưa có dữ liệu giá (${res.status}). ${hint}`)
  }
  return (await res.json()) as LatestPayload
}

export async function fetchRemoteHistory(): Promise<PricePoint[]> {
  try {
    const res = await fetch(dataUrl('history.json'), { cache: 'no-store' })
    if (!res.ok) return []
    const data = (await res.json()) as PricePoint[]
    if (!Array.isArray(data)) return []
    return data.filter(
      (p) => p.kind === 'hkn_nhan_9999' || p.kind === 'kkvh_9999',
    )
  } catch {
    return []
  }
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

/** Dev proxy | Dev test fixtures | Production JSON from Actions scrape. */
export async function fetchAllSnapshots(): Promise<{
  hkn: StoreSnapshot
  kkvh: StoreSnapshot
  fetchedAt: number
  source: SnapshotSource
}> {
  if (useTestData()) {
    const latest = await fetchLatestFromJson()
    return {
      hkn: latest.hkn,
      kkvh: latest.kkvh,
      fetchedAt: latest.fetchedAt,
      source: 'test',
    }
  }

  if (import.meta.env.DEV) {
    const [hkn, kkvh] = await Promise.all([fetchHknSnapshot(), fetchKkvhSnapshot()])
    return { hkn, kkvh, fetchedAt: Date.now(), source: 'proxy' }
  }

  const latest = await fetchLatestFromJson()
  return {
    hkn: latest.hkn,
    kkvh: latest.kkvh,
    fetchedAt: latest.fetchedAt,
    source: 'json',
  }
}
