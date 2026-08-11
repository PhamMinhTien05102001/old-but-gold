import type { StoreId } from '../types'

export type StoreHealth = 'ok' | 'fallback' | 'failed'

export type StoreMeta = {
  id: StoreId
  label: string
  url: string
}

/** Keep in sync with scripts/stores/{id}.json crawl policy. */
export type CrawlPolicy =
  | {
      mode: 'adaptive'
      intervalMinutes: number
      minIntervalMinutes: number
      maxIntervalMinutes: number
    }
  | {
      mode: 'fixed'
      intervalMinutes: number
    }

/** Runtime slice from public/data/schedule.json → stores.{id}. */
export type StoreScheduleRuntime = {
  intervalMinutes?: number
  lastCrawlAt?: string | null
  nextCrawlAt?: string | null
  lastResult?: string
  lastChangedKinds?: string[]
  status?: StoreHealth
  rows?: number
  error?: string
}

export type ScheduleStoresMap = Record<StoreId, StoreScheduleRuntime>

/** Frontend mirror of scripts/stores/{id}.json — URLs for stale-data notices. */
export const STORE_META: Record<StoreId, StoreMeta> = {
  hkn: {
    id: 'hkn',
    label: 'Hoa Kim Nguyên',
    url: 'https://hoakimnguyen.com/tra-cuu-gia-vang/',
  },
  kkvh: {
    id: 'kkvh',
    label: 'Kim Khánh Việt Hùng',
    url: 'https://kimkhanhviethung.vn/tra-cuu-gia-vang.html',
  },
  hn: {
    id: 'hn',
    label: 'Hồng Ngọc',
    url: 'https://giavangmaothiet.com/gia-vang-hong-ngoc-hom-nay/',
  },
}

/** Keep in sync with scripts/stores/{id}.json → crawl. */
export const CRAWL_POLICY: Record<StoreId, CrawlPolicy> = {
  hkn: {
    mode: 'adaptive',
    intervalMinutes: 60,
    minIntervalMinutes: 30,
    maxIntervalMinutes: 120,
  },
  kkvh: {
    mode: 'adaptive',
    intervalMinutes: 60,
    minIntervalMinutes: 30,
    maxIntervalMinutes: 120,
  },
  hn: {
    mode: 'fixed',
    intervalMinutes: 30,
  },
}

export function isStoreUnhealthy(status?: StoreHealth): boolean {
  return status === 'fallback' || status === 'failed'
}

export function storeHealthLabel(status?: StoreHealth): string {
  if (status === 'fallback') return 'Giá lần trước'
  if (status === 'failed') return 'Lỗi'
  return 'OK'
}

export function kindShortLabel(kind: string): string {
  if (kind === 'hkn_nhan_9999') return 'HKN nhẫn 9999'
  if (kind === 'kkvh_9999') return 'KKVH 999.9'
  if (kind === 'hn_nhan_9999') return 'HN nhẫn 9999'
  return kind
}
