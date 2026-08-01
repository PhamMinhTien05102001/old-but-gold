import { useMemo, useState } from 'react'
import type { ChartRange, CurrentRow, PricePoint } from '../types'
import { filterHistory } from '../lib/sjc'
import { formatVnd } from '../lib/normalize'
import { PriceChart } from './PriceChart'
import { RangeFilter } from './RangeFilter'

type Props = {
  hknRows: CurrentRow[]
  kkvhRows: CurrentRow[]
  history: PricePoint[]
}

function pickSell(rows: CurrentRow[], prefer: CurrentRow['kind'][]): number {
  for (const kind of prefer) {
    const row = rows.find((r) => r.kind === kind)
    if (row?.sell) return row.sell
  }
  return rows[0]?.sell ?? 0
}

function pickBuy(rows: CurrentRow[], prefer: CurrentRow['kind'][]): number {
  for (const kind of prefer) {
    const row = rows.find((r) => r.kind === kind)
    if (row?.buy) return row.buy
  }
  return rows[0]?.buy ?? 0
}

export function CompareTab({ hknRows, kkvhRows, history }: Props) {
  const [range, setRange] = useState<ChartRange>('30D')

  const hknSell = pickSell(hknRows, ['hkn_nhan_9999', 'hkn_khau_9999'])
  const kkvhSell = pickSell(kkvhRows, ['kkvh_9999'])
  const hknBuy = pickBuy(hknRows, ['hkn_nhan_9999', 'hkn_khau_9999'])
  const kkvhBuy = pickBuy(kkvhRows, ['kkvh_9999'])

  const cheaper =
    hknSell && kkvhSell
      ? hknSell < kkvhSell
        ? 'Hoa Kim Nguyên đang bán rẻ hơn'
        : kkvhSell < hknSell
          ? 'Kim Khánh Việt Hùng đang bán rẻ hơn'
          : 'Hai tiệm đang bán bằng nhau'
      : 'Chưa đủ dữ liệu để so sánh'

  const filtered = useMemo(
    () =>
      filterHistory(history, range, ['hkn_nhan_9999', 'hkn_khau_9999', 'kkvh_9999']),
    [history, range],
  )

  const chartData = useMemo(() => {
    const byTs = new Map<number, Record<string, number>>()
    for (const p of filtered) {
      const row = byTs.get(p.ts) ?? { ts: p.ts }
      if (p.kind === 'kkvh_9999') {
        row.kkvh_sell = p.sell
        row.kkvh_buy = p.buy
      } else if (p.kind === 'hkn_nhan_9999') {
        row.hkn_sell = p.sell
        row.hkn_buy = p.buy
      } else if (p.kind === 'hkn_khau_9999' && row.hkn_sell == null) {
        row.hkn_sell = p.sell
        row.hkn_buy = p.buy
      }
      byTs.set(p.ts, row)
    }
    return Array.from(byTs.values()).sort((a, b) => a.ts - b.ts)
  }, [filtered])

  const diff = hknSell && kkvhSell ? Math.abs(hknSell - kkvhSell) : 0

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>So sánh 2 tiệm</h2>
          <p className="muted">So giá bán ra vàng 9999 (VND/chỉ)</p>
        </div>
        <RangeFilter value={range} onChange={setRange} />
      </header>

      <div className="metric-grid">
        <article className="metric-card">
          <h3>Hoa Kim Nguyên</h3>
          <p className="metric-main">{formatVnd(hknSell)}</p>
          <p className="muted">Mua: {formatVnd(hknBuy)}</p>
        </article>
        <article className="metric-card">
          <h3>Kim Khánh Việt Hùng</h3>
          <p className="metric-main">{formatVnd(kkvhSell)}</p>
          <p className="muted">Mua: {formatVnd(kkvhBuy)}</p>
        </article>
        <article className="metric-card highlight">
          <h3>Kết luận nhanh</h3>
          <p className="metric-main small">{cheaper}</p>
          <p className="muted">Chênh bán ra: {formatVnd(diff)}</p>
        </article>
      </div>

      <h3 className="section-title">Biểu đồ bán ra theo thời gian</h3>
      <PriceChart
        data={chartData}
        series={[
          { key: 'hkn_sell', name: 'HKN bán', color: '#b45309' },
          { key: 'kkvh_sell', name: 'KKVH bán', color: '#1d4ed8' },
          { key: 'hkn_buy', name: 'HKN mua', color: '#d6a35c' },
          { key: 'kkvh_buy', name: 'KKVH mua', color: '#93c5fd' },
        ]}
        emptyMessage="Chưa có lịch sử để so sánh. Refresh để bắt đầu ghi nhận."
      />
    </section>
  )
}
