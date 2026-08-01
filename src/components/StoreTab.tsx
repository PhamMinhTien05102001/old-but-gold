import { useMemo, useState } from 'react'
import type { ChartRange, CurrentRow, PricePoint, StoreId } from '../types'
import { filterHistory } from '../lib/history'
import { normalizeSourceUpdatedAt } from '../lib/normalize'
import { isStoreUnhealthy, type StoreHealth } from '../lib/stores'
import { PriceChart } from './PriceChart'
import { PriceCards } from './PriceCards'
import { PriceTable } from './PriceTable'
import { RangeFilter } from './RangeFilter'

type Props = {
  store: StoreId
  storeName: string
  rows: CurrentRow[]
  sourceUpdatedAt?: string
  history: PricePoint[]
  health?: StoreHealth
  sourceUrl?: string
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
  hn_nhan_9999: {
    sellKey: 'hn_sell',
    sellColor: '#0f766e',
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

export function StoreTab({
  store,
  storeName,
  rows,
  sourceUpdatedAt,
  history,
  health = 'ok',
  sourceUrl,
}: Props) {
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

  const showStaleBanner = isStoreUnhealthy(health)

  return (
    <section className="border-line bg-surface rounded-2xl border px-4 pt-4 pb-5 shadow-[0_18px_40px_rgba(26,20,16,0.18)] sm:px-[1.15rem]">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display mb-1 text-[1.45rem]">{storeName}</h2>
          {sourceUpdatedAt ? (
            <p className="text-muted m-0">
              Nguồn cập nhật: {normalizeSourceUpdatedAt(sourceUpdatedAt)}
            </p>
          ) : null}
        </div>
        <RangeFilter value={range} onChange={setRange} />
      </header>

      {showStaleBanner ? (
        <p className="border-line mb-4 rounded-xl border border-[#fca5a5] bg-[#fef2f2] px-3.5 py-3 text-[0.92rem] text-[#991b1b]">
          {health === 'failed'
            ? 'Không lấy được giá từ trang web chính và không còn dữ liệu lần trước.'
            : 'Trang web chính đang không cập nhật giá (hoặc crawl lỗi). Đang hiển thị giá lần trước.'}{' '}
          {sourceUrl ? (
            <>
              Xem:{' '}
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold break-all underline"
              >
                {sourceUrl}
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      {!rows.length ? (
        <p className="text-muted m-0">Chưa có dữ liệu giá.</p>
      ) : (
        <>
          <PriceCards
            rows={rows}
            history={history}
            rangeHistory={storeHistory}
            range={range}
          />
          <PriceTable rows={rows} />

          <h3 className="font-display mt-2 mb-3 text-[1.15rem]">
            Biểu đồ lịch sử ({store.toUpperCase()})
          </h3>
          <PriceChart
            data={chartData}
            series={series}
            emptyMessage="Chưa có lịch sử. Dữ liệu sẽ tích lũy theo các lần scrape."
          />
        </>
      )}
    </section>
  )
}
