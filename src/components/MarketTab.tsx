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
  const deltaClass = deltaSell > 0 ? 'text-up' : deltaSell < 0 ? 'text-down' : ''

  return (
    <section className="border-line bg-surface rounded-2xl border px-4 pt-4 pb-5 shadow-[0_18px_40px_rgba(26,20,16,0.18)] sm:px-[1.15rem]">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display mb-1 text-[1.45rem]">
            Thị trường SJC (tham chiếu)
          </h2>
          <p className="text-muted m-0">
            Lịch sử SJC 9999 công khai — không phải giá niêm yết HKN/KKVH. Đơn vị quy đổi
            VND/chỉ.
          </p>
        </div>
        <RangeFilter value={range} onChange={setRange} />
      </header>

      {loading ? <p className="text-muted m-0">Đang tải lịch sử SJC…</p> : null}
      {error ? <p className="text-down font-semibold">{error}</p> : null}

      {!loading && !error ? (
        <>
          <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
            <article className="border-line bg-surface-2 rounded-xl border px-4 py-3.5">
              <h3 className="text-muted mb-1.5 text-[0.95rem] font-semibold">
                Bán ra gần nhất
              </h3>
              <p className="font-display m-0 text-[1.55rem] font-bold">
                {formatVnd(latest?.sell ?? 0)}
              </p>
              <p className="text-muted m-0">{latest?.date ?? '—'}</p>
            </article>
            <article className="border-line bg-surface-2 rounded-xl border px-4 py-3.5">
              <h3 className="text-muted mb-1.5 text-[0.95rem] font-semibold">
                Mua vào gần nhất
              </h3>
              <p className="font-display m-0 text-[1.55rem] font-bold">
                {formatVnd(latest?.buy ?? 0)}
              </p>
            </article>
            <article className="border-line bg-surface-2 rounded-xl border px-4 py-3.5">
              <h3 className="text-muted mb-1.5 text-[0.95rem] font-semibold">
                Δ bán trong khoảng
              </h3>
              <p
                className={`font-display m-0 text-[1.15rem] leading-snug font-bold ${deltaClass}`}
              >
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
