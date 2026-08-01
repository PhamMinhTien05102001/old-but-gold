import { useEffect, useMemo, useState } from 'react'
import type { ChartRange, SjcPoint } from '../types'
import { fetchSjcHistory, filterByRange } from '../lib/sjc'
import { formatVnd } from '../lib/normalize'
import { PriceChart } from './PriceChart'
import { RangeFilter } from './RangeFilter'

export function MarketTab() {
  const [range, setRange] = useState<ChartRange>('3M')
  const [points, setPoints] = useState<SjcPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchSjcHistory()
        if (!cancelled) setPoints(data)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Lỗi tải SJC')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => filterByRange(points, range), [points, range])

  const chartData = useMemo(
    () => filtered.map((p) => ({ ts: p.ts, buy: p.buy, sell: p.sell })),
    [filtered],
  )

  const latest = filtered.at(-1)
  const first = filtered[0]
  const deltaSell = latest && first ? latest.sell - first.sell : 0

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>Thị trường SJC (tham chiếu)</h2>
          <p className="muted">
            Lịch sử SJC 9999 công khai — không phải giá niêm yết HKN/KKVH. Đơn vị quy đổi
            VND/chỉ.
          </p>
        </div>
        <RangeFilter value={range} onChange={setRange} />
      </header>

      {loading ? <p className="muted">Đang tải lịch sử SJC…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error ? (
        <>
          <div className="metric-grid">
            <article className="metric-card">
              <h3>Bán ra gần nhất</h3>
              <p className="metric-main">{formatVnd(latest?.sell ?? 0)}</p>
              <p className="muted">{latest?.date ?? '—'}</p>
            </article>
            <article className="metric-card">
              <h3>Mua vào gần nhất</h3>
              <p className="metric-main">{formatVnd(latest?.buy ?? 0)}</p>
            </article>
            <article className="metric-card">
              <h3>Δ bán trong khoảng</h3>
              <p className={`metric-main small ${deltaSell > 0 ? 'up' : deltaSell < 0 ? 'down' : ''}`}>
                {deltaSell > 0 ? '+' : ''}
                {formatVnd(deltaSell)}
              </p>
            </article>
          </div>

          <PriceChart
            data={chartData}
            series={[
              { key: 'buy', name: 'SJC mua', color: '#166534' },
              { key: 'sell', name: 'SJC bán', color: '#9a3412' },
            ]}
            emptyMessage="Không có điểm dữ liệu trong khoảng đã chọn."
          />
        </>
      ) : null}
    </section>
  )
}
