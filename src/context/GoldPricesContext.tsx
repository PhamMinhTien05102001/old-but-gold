import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CurrentRow, PricePoint, StoreId, StoreSnapshot } from '../types'
import {
  fetchAllSnapshots,
  fetchRemoteHistory,
  type StoreStatusMap,
} from '../lib/fetchPrices'
import type { StoreHealth } from '../lib/stores'

const DEFAULT_STATUS: StoreStatusMap = {
  hkn: 'ok',
  kkvh: 'ok',
  hn: 'ok',
}

type GoldPricesContextValue = {
  loading: boolean
  error: string | null
  history: PricePoint[]
  hkn: StoreSnapshot | null
  kkvh: StoreSnapshot | null
  hn: StoreSnapshot | null
  hknRows: CurrentRow[]
  kkvhRows: CurrentRow[]
  hnRows: CurrentRow[]
  storeStatus: StoreStatusMap
  getStoreStatus: (id: StoreId) => StoreHealth
}

const GoldPricesContext = createContext<GoldPricesContextValue | null>(null)

export function GoldPricesProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<PricePoint[]>([])
  const [hkn, setHkn] = useState<StoreSnapshot | null>(null)
  const [kkvh, setKkvh] = useState<StoreSnapshot | null>(null)
  const [hn, setHn] = useState<StoreSnapshot | null>(null)
  const [storeStatus, setStoreStatus] = useState<StoreStatusMap>(DEFAULT_STATUS)

  const loadPrices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ hkn: h, kkvh: k, hn: n, storeStatus: status }, remote] =
        await Promise.all([fetchAllSnapshots(), fetchRemoteHistory()])
      setHkn(h)
      setKkvh(k)
      setHn(n)
      setStoreStatus(status)
      setHistory(remote)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được giá')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPrices()
  }, [loadPrices])

  const value = useMemo<GoldPricesContextValue>(
    () => ({
      loading,
      error,
      history,
      hkn,
      kkvh,
      hn,
      hknRows: hkn?.rows ?? [],
      kkvhRows: kkvh?.rows ?? [],
      hnRows: hn?.rows ?? [],
      storeStatus,
      getStoreStatus: (id) => storeStatus[id] ?? 'ok',
    }),
    [loading, error, history, hkn, kkvh, hn, storeStatus],
  )

  return <GoldPricesContext.Provider value={value}>{children}</GoldPricesContext.Provider>
}

export function useGoldPrices(): GoldPricesContextValue {
  const ctx = useContext(GoldPricesContext)
  if (!ctx) {
    throw new Error('useGoldPrices must be used within GoldPricesProvider')
  }
  return ctx
}
