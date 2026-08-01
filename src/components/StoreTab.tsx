import { useMemo, useState } from 'react'
import type { ChartRange, CurrentRow, PricePoint, StoreId } from '../types'
import { filterHistory } from '../lib/sjc'
import { previousPoint } from '../lib/history'
import { formatDelta, formatVnd, spread, spreadPercent } from '../lib/normalize'
import { PriceChart } from './PriceChart'
import { RangeFilter } from './RangeFilter'

type Props = {
  store: StoreId
  storeName: string
  rows: CurrentRow[]
  sourceUpdatedAt?: string
  history: PricePoint[]
}

/** Chart plots sell (bán ra) only. */
const KIND_SERIES: Record<string, { sellKey: string; sellColor: string }> = {
  hkn_nhan_9999: {
    sellKey: 'nhan_sell',
    sellColor: '#b45309',
  },
  kkvh_9999: {
    sellKey: 'sell',
    sellColor: '#b91c1c',
  },
}

function buildChartData(points: PricePoint[], kinds: CurrentRow['kind'][]) {
  const byTs = new Map<number, Record<string, number | string>>()

  for (const p of points) {
    if (!kinds.includes(p.kind)) continue
    const meta = KIND_SERIES[p.kind]
    if (!meta) continue
    const row = byTs.get(p.ts) ?? { ts: p.ts }
    row[meta.sellKey] = p.sell
    byTs.set(p.ts, row)
  }

  return Array.from(byTs.values()).sort((a, b) => Number(a.ts) - Number(b.ts))
}

export function StoreTab({ store, storeName, rows, sourceUpdatedAt, history }: Props) {
  const [range, setRange] = useState<ChartRange>('30D')
  const kinds = rows.map((r) => r.kind)
  const storeHistory = useMemo(
    () => filterHistory(history, range, kinds),
    [history, range, kinds],
  )

  const chartData = useMemo(
    () => buildChartData(storeHistory, kinds),
    [storeHistory, kinds],
  )

  const series = useMemo(() => {
    const out: { key: string; name: string; color: string }[] = []
    for (const row of rows) {
      const meta = KIND_SERIES[row.kind]
      if (!meta) continue
      out.push({
        key: meta.sellKey,
        name: `${row.label} · Bán`,
        color: meta.sellColor,
      })
    }
    return out
  }, [rows])

  return (
    <section className="border-line bg-surface rounded-2xl border px-4 pt-4 pb-5 shadow-[0_18px_40px_rgba(26,20,16,0.18)] sm:px-[1.15rem]">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display mb-1 text-[1.45rem]">{storeName}</h2>
          <p className="text-muted m-0">
            Vàng 9999 · đơn vị VND/chỉ
            {sourceUpdatedAt ? ` · Nguồn cập nhật: ${sourceUpdatedAt}` : ''}
          </p>
        </div>
        <RangeFilter value={range} onChange={setRange} />
      </header>

      {!rows.length ? (
        <p className="text-muted m-0">Chưa có dữ liệu. Bấm Refresh để lấy giá.</p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
            {rows.map((row) => {
              const prev = previousPoint(history, row.kind)
              const delta = prev ? row.sell - prev.sell : 0
              const deltaClass =
                delta > 0
                  ? 'text-up font-semibold'
                  : delta < 0
                    ? 'text-down font-semibold'
                    : 'text-muted'
              return (
                <article
                  key={row.kind}
                  className="border-line bg-surface-2 rounded-xl border px-4 py-3.5"
                >
                  <h3 className="text-muted mb-1.5 text-[0.95rem] font-semibold">
                    {row.label}
                  </h3>
                  <p className="font-display m-0 text-[1.55rem] font-bold">
                    {formatVnd(row.sell)}
                  </p>
                  <p className="text-muted m-0">Bán ra</p>
                  <div className="my-2 flex flex-col gap-0.5 text-[0.92rem]">
                    <span>Mua: {formatVnd(row.buy)}</span>
                    <span>
                      Spread: {formatVnd(spread(row.buy, row.sell))} (
                      {spreadPercent(row.buy, row.sell).toFixed(2)}%)
                    </span>
                  </div>
                  <p className={deltaClass}>Δ bán vs lần trước: {formatDelta(delta)}</p>
                </article>
              )
            })}
          </div>

          <div className="border-line mb-4 overflow-x-auto rounded-xl border">
            <table className="w-full border-collapse text-[0.95rem]">
              <thead>
                <tr>
                  <th className="border-line bg-table-head border-b px-3.5 py-2.5 text-left font-bold">
                    Loại
                  </th>
                  <th className="border-line bg-table-head border-b px-3.5 py-2.5 text-left font-bold">
                    Mua vào
                  </th>
                  <th className="border-line bg-table-head border-b px-3.5 py-2.5 text-left font-bold">
                    Bán ra
                  </th>
                  <th className="border-line bg-table-head border-b px-3.5 py-2.5 text-left font-bold">
                    Chênh
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.kind} className="last:[&>td]:border-b-0">
                    <td className="border-line border-b px-3.5 py-2.5 text-left">
                      {row.label}
                    </td>
                    <td className="border-line border-b px-3.5 py-2.5 text-left">
                      {formatVnd(row.buy)}
                    </td>
                    <td className="border-line border-b px-3.5 py-2.5 text-left">
                      {formatVnd(row.sell)}
                    </td>
                    <td className="border-line border-b px-3.5 py-2.5 text-left">
                      {formatVnd(spread(row.buy, row.sell))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="font-display mt-2 mb-3 text-[1.15rem]">
            Biểu đồ lịch sử ({store.toUpperCase()})
          </h3>
          <PriceChart
            data={chartData}
            series={series}
            emptyMessage="Chưa có lịch sử. Refresh vài lần (hoặc qua các ngày) để tích lũy biểu đồ."
          />
        </>
      )}
    </section>
  )
}
