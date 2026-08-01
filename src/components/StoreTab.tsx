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

const KIND_SERIES: Record<
  string,
  { buyKey: string; sellKey: string; buyColor: string; sellColor: string }
> = {
  hkn_nhan_9999: {
    buyKey: 'nhan_buy',
    sellKey: 'nhan_sell',
    buyColor: '#1f6f5b',
    sellColor: '#b45309',
  },
  hkn_khau_9999: {
    buyKey: 'khau_buy',
    sellKey: 'khau_sell',
    buyColor: '#0f766e',
    sellColor: '#c2410c',
  },
  kkvh_9999: {
    buyKey: 'buy',
    sellKey: 'sell',
    buyColor: '#1d4ed8',
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
    row[meta.buyKey] = p.buy
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
      out.push(
        { key: meta.buyKey, name: `${row.label} · Mua`, color: meta.buyColor },
        { key: meta.sellKey, name: `${row.label} · Bán`, color: meta.sellColor },
      )
    }
    return out
  }, [rows])

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>{storeName}</h2>
          <p className="muted">
            Vàng 9999 · đơn vị VND/chỉ
            {sourceUpdatedAt ? ` · Nguồn cập nhật: ${sourceUpdatedAt}` : ''}
          </p>
        </div>
        <RangeFilter value={range} onChange={setRange} />
      </header>

      {!rows.length ? (
        <p className="muted">Chưa có dữ liệu. Bấm Refresh để lấy giá.</p>
      ) : (
        <>
          <div className="metric-grid">
            {rows.map((row) => {
              const prev = previousPoint(history, row.kind)
              const delta = prev ? row.sell - prev.sell : 0
              return (
                <article key={row.kind} className="metric-card">
                  <h3>{row.label}</h3>
                  <p className="metric-main">{formatVnd(row.sell)}</p>
                  <p className="muted">Bán ra</p>
                  <div className="metric-row">
                    <span>Mua: {formatVnd(row.buy)}</span>
                    <span>
                      Spread: {formatVnd(spread(row.buy, row.sell))} (
                      {spreadPercent(row.buy, row.sell).toFixed(2)}%)
                    </span>
                  </div>
                  <p className={delta > 0 ? 'up' : delta < 0 ? 'down' : 'muted'}>
                    Δ bán vs lần trước: {formatDelta(delta)}
                  </p>
                </article>
              )
            })}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Loại</th>
                  <th>Mua vào</th>
                  <th>Bán ra</th>
                  <th>Chênh</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.kind}>
                    <td>{row.label}</td>
                    <td>{formatVnd(row.buy)}</td>
                    <td>{formatVnd(row.sell)}</td>
                    <td>{formatVnd(spread(row.buy, row.sell))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="section-title">Biểu đồ lịch sử ({store.toUpperCase()})</h3>
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
