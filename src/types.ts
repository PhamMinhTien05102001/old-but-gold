export type StoreId = 'hkn' | 'kkvh' | 'hn'

export type GoldKind = 'hkn_nhan_9999' | 'kkvh_9999' | 'hn_nhan_9999'

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

/** Chart time window: quick preset, single calendar day, or inclusive A→B range. */
export type ChartTimeFilter =
  | { mode: 'preset'; range: ChartRange }
  | { mode: 'day'; day: string } // YYYY-MM-DD
  /** Range: omit/empty `from` → start of history; omit/empty `to` → now. */
  | { mode: 'range'; from?: string | null; to?: string | null }
