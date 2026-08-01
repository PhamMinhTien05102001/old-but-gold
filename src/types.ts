export type StoreId = 'hkn' | 'kkvh'

export type GoldKind = 'hkn_nhan_9999' | 'hkn_khau_9999' | 'kkvh_9999'

export type PricePoint = {
  ts: number
  store: StoreId
  kind: GoldKind
  label: string
  buy: number
  sell: number
  sourceUpdatedAt?: string
}

export type CurrentRow = {
  kind: GoldKind
  label: string
  buy: number
  sell: number
}

export type StoreSnapshot = {
  store: StoreId
  sourceUpdatedAt?: string
  fetchedAt: number
  rows: CurrentRow[]
}

export type ChartRange = '1D' | '7D' | '30D' | '3M' | 'All'

export type SjcPoint = {
  date: string
  ts: number
  buy: number
  sell: number
}
