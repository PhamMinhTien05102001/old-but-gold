import { useCallback, useEffect, useState } from 'react'
import type { CurrentRow, PricePoint, StoreSnapshot, TabId } from './types'
import { fetchAllSnapshots } from './lib/fetchPrices'
import { appendSnapshots, loadHistory } from './lib/history'
import { RefreshBar } from './components/RefreshBar'
import { StoreTab } from './components/StoreTab'
import { CompareTab } from './components/CompareTab'
import { MarketTab } from './components/MarketTab'
import './App.css'

const TABS: { id: TabId; label: string }[] = [
  { id: 'hkn', label: 'Hoa Kim Nguyên' },
  { id: 'kkvh', label: 'Kim Khánh Việt Hùng' },
  { id: 'compare', label: 'So sánh' },
  { id: 'market', label: 'Thị trường SJC' },
]

export default function App() {
  const [tab, setTab] = useState<TabId>('hkn')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<PricePoint[]>(() => loadHistory())
  const [hkn, setHkn] = useState<StoreSnapshot | null>(null)
  const [kkvh, setKkvh] = useState<StoreSnapshot | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<number | undefined>()

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { hkn: h, kkvh: k } = await fetchAllSnapshots()
      setHkn(h)
      setKkvh(k)
      setLastFetchedAt(Date.now())
      const next = appendSnapshots([h, k])
      setHistory(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không cập nhật được giá')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const hknRows: CurrentRow[] = hkn?.rows ?? []
  const kkvhRows: CurrentRow[] = kkvh?.rows ?? []

  return (
    <div className="app">
      <header className="hero">
        <p className="brand">Old But Gold</p>
        <h1>Theo dõi giá vàng 9999</h1>
        <p className="hero-sub">
          Hoa Kim Nguyên & Kim Khánh Việt Hùng — bảng giá, chênh mua/bán, biểu đồ lịch sử
          tự tích lũy, và tham chiếu thị trường SJC.
        </p>
      </header>

      <RefreshBar
        loading={loading}
        lastFetchedAt={lastFetchedAt}
        error={error}
        onRefresh={() => void refresh()}
      />

      <nav className="tabs" aria-label="Chọn nguồn">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'hkn' ? (
          <StoreTab
            store="hkn"
            storeName="Hoa Kim Nguyên"
            rows={hknRows}
            sourceUpdatedAt={hkn?.sourceUpdatedAt}
            history={history}
          />
        ) : null}
        {tab === 'kkvh' ? (
          <StoreTab
            store="kkvh"
            storeName="Kim Khánh Việt Hùng"
            rows={kkvhRows}
            sourceUpdatedAt={kkvh?.sourceUpdatedAt}
            history={history}
          />
        ) : null}
        {tab === 'compare' ? (
          <CompareTab hknRows={hknRows} kkvhRows={kkvhRows} history={history} />
        ) : null}
        {tab === 'market' ? <MarketTab /> : null}
      </main>

      <footer className="footer">
        <p>
          Giá chỉ mang tính tham khảo. Chạy qua <code>npm run dev</code> /{' '}
          <code>npm run preview</code> để dùng Vite proxy (tránh CORS).
        </p>
      </footer>
    </div>
  )
}
