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
import {
  fetchAllSnapshots,
  fetchRemoteHistory,
  useTestData,
} from '../lib/fetchPrices'
import { appendSnapshots, loadHistory, mergeHistories, saveHistory } from '../lib/history'

type GoldPricesContextValue = {
  loading: boolean
  error: string | null
  history: PricePoint[]
  hkn: StoreSnapshot | null
  kkvh: StoreSnapshot | null
  hknRows: CurrentRow[]
  kkvhRows: CurrentRow[]
}

const GoldPricesContext = createContext<GoldPricesContextValue | null>(null)

export function GoldPricesProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<PricePoint[]>(() => loadHistory())
  const [hkn, setHkn] = useState<StoreSnapshot | null>(null)
  const [kkvh, setKkvh] = useState<StoreSnapshot | null>(null)

  useEffect(() => {
    // Production: merge remote history. Dev test: load fixtures from data-test.
    if (import.meta.env.DEV && !useTestData()) return
    void (async () => {
      const remote = await fetchRemoteHistory()
      if (!remote.length) return
      if (useTestData()) {
        saveHistory(remote)
        setHistory(remote)
        return
      }
      const merged = mergeHistories(loadHistory(), remote)
      saveHistory(merged)
      setHistory(merged)
    })()
  }, [])

  const loadPrices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { hkn: h, kkvh: k, source } = await fetchAllSnapshots()
      setHkn(h)
      setKkvh(k)
      if (source === 'test') {
        const remote = await fetchRemoteHistory()
        saveHistory(remote)
        setHistory(remote)
      } else {
        setHistory(appendSnapshots([h, k]))
      }
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
      hknRows: hkn?.rows ?? [],
      kkvhRows: kkvh?.rows ?? [],
    }),
    [loading, error, history, hkn, kkvh],
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
