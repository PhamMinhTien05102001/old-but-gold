import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CurrentRow, PricePoint, StoreSnapshot } from '../types'
import { fetchAllSnapshots, fetchRemoteHistory } from '../lib/fetchPrices'
import { appendSnapshots, loadHistory, mergeHistories, saveHistory } from '../lib/history'

type GoldPricesContextValue = {
  loading: boolean
  error: string | null
  history: PricePoint[]
  hkn: StoreSnapshot | null
  kkvh: StoreSnapshot | null
  hknRows: CurrentRow[]
  kkvhRows: CurrentRow[]
  lastFetchedAt?: number
  refresh: () => Promise<void>
}

const GoldPricesContext = createContext<GoldPricesContextValue | null>(null)

export function GoldPricesProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<PricePoint[]>(() => loadHistory())
  const [hkn, setHkn] = useState<StoreSnapshot | null>(null)
  const [kkvh, setKkvh] = useState<StoreSnapshot | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<number | undefined>()

  useEffect(() => {
    if (import.meta.env.DEV) return
    void (async () => {
      const remote = await fetchRemoteHistory()
      if (!remote.length) return
      const merged = mergeHistories(loadHistory(), remote)
      saveHistory(merged)
      setHistory(merged)
    })()
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { hkn: h, kkvh: k, fetchedAt } = await fetchAllSnapshots()
      setHkn(h)
      setKkvh(k)
      setLastFetchedAt(fetchedAt)
      setHistory(appendSnapshots([h, k]))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không cập nhật được giá')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<GoldPricesContextValue>(
    () => ({
      loading,
      error,
      history,
      hkn,
      kkvh,
      hknRows: hkn?.rows ?? [],
      kkvhRows: kkvh?.rows ?? [],
      lastFetchedAt,
      refresh,
    }),
    [loading, error, history, hkn, kkvh, lastFetchedAt, refresh],
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
