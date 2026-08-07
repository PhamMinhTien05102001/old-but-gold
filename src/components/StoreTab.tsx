import { useMemo, useState } from 'react'
import type { ChartRange, CurrentRow, PricePoint, StoreId } from '../types'
import { filterHistory, latestPoint, previousPoint } from '../lib/history'
import {
  formatElapsed,
  normalizeSourceUpdatedAt,
  pointTimeMs,
} from '../lib/normalize'
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

/** One chart row per history record (x = shop sourceUpdatedAt). */
function buildChartRows(points: PricePoint[], kinds: CurrentRow['kind'][]) {
  const out: Record<string, number | string>[] = []

  for (const p of points) {
    if (!kinds.includes(p.kind)) continue
    const meta = KIND_SERIES[p.kind]
    if (!meta) continue
    out.push({
      ts: pointTimeMs(p),
      [meta.sellKey]: p.sell,
    })
  }

  return out.sort((a, b) => Number(a.ts) - Number(b.ts))
}

/**
 * Keep first + last of each constant-price run so the line shows a true
 * flat span in time (middle same-price scrapes are redundant vertices).
 */
function collapseSamePricePlateaus(
  rows: Record<string, number | string>[],
  sellKey: string,
): Record<string, number | string>[] {
  if (rows.length <= 2) return rows
  const out: Record<string, number | string>[] = []
  for (let i = 0; i < rows.length; i++) {
    const curr = rows[i]
    const v = Number(curr[sellKey])
    if (!Number.isFinite(v)) {
      out.push(curr)
      continue
    }
    const prev = out[out.length - 1]
    const next = rows[i + 1]
    if (
      prev &&
      next &&
      Number(prev[sellKey]) === v &&
      Number(next[sellKey]) === v
    ) {
      continue
    }
    out.push(curr)
  }
  return out
}

function buildChartData(points: PricePoint[], kinds: CurrentRow['kind'][]) {
  const rows = buildChartRows(points, kinds)
  const sellKey = kinds.map((k) => KIND_SERIES[k]?.sellKey).find(Boolean)
  if (!sellKey) return rows
  return collapseSamePricePlateaus(rows, sellKey)
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
  const primaryRow = rows[0]
  // Chart + label follow history tip (JSON). DEV proxy may be newer — don't show that as "Nguồn cập nhật".
  const historyTip = primaryRow ? latestPoint(history, primaryRow.kind) : undefined
  const displaySourceUpdatedAt =
    historyTip?.sourceUpdatedAt ?? sourceUpdatedAt
  // Gap vs immediate previous scrape (same or different price) — not vs now / last price change.
  const prevPoint = primaryRow
    ? previousPoint(history, primaryRow.kind)
    : undefined
  const prevAge =
    prevPoint && historyTip
      ? formatElapsed(pointTimeMs(prevPoint), pointTimeMs(historyTip))
      : null
  const sourceUpdatedLabel = displaySourceUpdatedAt
    ? normalizeSourceUpdatedAt(displaySourceUpdatedAt)
    : undefined

  return (
    <section className="border-line bg-surface rounded-2xl border px-4 pt-4 pb-5 shadow-[0_18px_40px_rgba(26,20,16,0.18)] sm:px-[1.15rem]">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display mb-1 text-[1.45rem]">{storeName}</h2>
          {sourceUpdatedLabel ? (
            <p className="text-muted m-0">
              Nguồn cập nhật: {sourceUpdatedLabel}
              {prevAge ? ` (cách lần cập nhật trước đó ${prevAge})` : null}
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
            sourceUpdatedAt={displaySourceUpdatedAt}
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
