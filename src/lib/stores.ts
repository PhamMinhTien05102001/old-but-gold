import type { StoreId } from '../types'

export type StoreHealth = 'ok' | 'fallback' | 'failed'

export type StoreMeta = {
  id: StoreId
  label: string
  url: string
}

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

export function isStoreUnhealthy(status?: StoreHealth): boolean {
  return status === 'fallback' || status === 'failed'
}

export function storeHealthLabel(status?: StoreHealth): string {
  if (status === 'fallback') return 'Giá lần trước'
  if (status === 'failed') return 'Lỗi'
  return 'OK'
}
