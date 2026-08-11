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
  EMPTY_SCHEDULE_STORES,
  fetchAllSnapshots,
  fetchRemoteHistory,
  type StoreStatusMap,
} from '../lib/fetchPrices'
import type { ScheduleStoresMap, StoreHealth } from '../lib/stores'

const DEFAULT_STATUS: StoreStatusMap = {
  hkn: 'ok',
  kkvh: 'ok',
  hn: 'ok',
}

export type LoadStatus = 'loading' | 'ready' | 'error'

type GoldPricesContextValue = {
  status: LoadStatus
  /** True while the initial (or in-flight) fetch has not finished. */
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
  scheduleStores: ScheduleStoresMap
  getStoreStatus: (id: StoreId) => StoreHealth
}

const GoldPricesContext = createContext<GoldPricesContextValue | null>(null)

export function GoldPricesProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<PricePoint[]>([])
  const [hkn, setHkn] = useState<StoreSnapshot | null>(null)
  const [kkvh, setKkvh] = useState<StoreSnapshot | null>(null)
  const [hn, setHn] = useState<StoreSnapshot | null>(null)
  const [storeStatus, setStoreStatus] = useState<StoreStatusMap>(DEFAULT_STATUS)
  const [scheduleStores, setScheduleStores] =
    useState<ScheduleStoresMap>(EMPTY_SCHEDULE_STORES)

  const loadPrices = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const remote = await fetchRemoteHistory()
      const {
        hkn: h,
        kkvh: k,
        hn: n,
        storeStatus: nextStatus,
        scheduleStores: nextSchedule,
      } = await fetchAllSnapshots(remote)
      setHkn(h)
      setKkvh(k)
      setHn(n)
      setStoreStatus(nextStatus)
      setScheduleStores(nextSchedule)
      setHistory(remote)
      setStatus('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được giá')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void loadPrices()
  }, [loadPrices])

  const value = useMemo<GoldPricesContextValue>(
    () => ({
      status,
      loading: status === 'loading',
      error,
      history,
      hkn,
      kkvh,
      hn,
      hknRows: hkn?.rows ?? [],
      kkvhRows: kkvh?.rows ?? [],
      hnRows: hn?.rows ?? [],
      storeStatus,
      scheduleStores,
      getStoreStatus: (id) => storeStatus[id] ?? 'ok',
    }),
    [status, error, history, hkn, kkvh, hn, storeStatus, scheduleStores],
  )

  return (
    <GoldPricesContext.Provider value={value}>{children}</GoldPricesContext.Provider>
  )
}

export function useGoldPrices(): GoldPricesContextValue {
  const ctx = useContext(GoldPricesContext)
  if (!ctx) {
    throw new Error('useGoldPrices must be used within GoldPricesProvider')
  }
  return ctx
}
