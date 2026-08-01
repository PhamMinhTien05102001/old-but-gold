import type { ChartRange, CurrentRow, GoldKind, PricePoint } from '../types'
import { previousPoint } from '../lib/history'
import { formatVnd } from '../lib/normalize'
import { SellDelta } from './SellDelta'

type Props = {
  rows: CurrentRow[]
  history: PricePoint[]
  /** History already filtered by the selected chart range. */
  rangeHistory: PricePoint[]
  range: ChartRange
}

function lowestSellPoint(points: PricePoint[], kind: GoldKind): PricePoint | undefined {
  let best: PricePoint | undefined
  for (const p of points) {
    if (p.kind !== kind || !p.sell) continue
    if (!best || p.sell < best.sell) best = p
  }
  return best
}

function formatLowDate(ts: number): string {
  return new Date(ts).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function PriceCards({ rows, history, rangeHistory, range }: Props) {
  return (
    <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
      {rows.map((row) => {
        const prev = previousPoint(history, row.kind)
        const delta = prev ? row.sell - prev.sell : 0
        const low = lowestSellPoint(rangeHistory, row.kind)

        return (
          <article
            key={row.kind}
            className="border-line bg-surface-2 grid grid-cols-2 items-stretch gap-0 rounded-xl border px-4 py-3.5"
          >
            <div className="min-w-0 pr-4">
              <h3 className="text-muted mb-1.5 text-[0.95rem] font-semibold">
                {row.label}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display m-0 text-[1.55rem] font-bold">
                  {formatVnd(row.sell)}
                </p>
                <SellDelta
                  delta={delta}
                  previousTs={prev?.ts}
                  className="text-[0.95rem]"
                />
              </div>
              <p className="text-muted m-0">Bán ra</p>
              <p className="m-0 mt-2 text-[0.92rem]">Mua: {formatVnd(row.buy)}</p>
            </div>

            <div className="border-line flex min-w-0 flex-col justify-start border-l pl-4 text-left">
              <p className="text-muted m-0 text-[0.85rem]">Thấp nhất · {range}</p>
              {low ? (
                <>
                  <p className="font-display m-0 text-[1.2rem] font-bold">
                    {formatVnd(low.sell)}
                  </p>
                  <p className="text-muted m-0 text-[0.9rem]">{formatLowDate(low.ts)}</p>
                </>
              ) : (
                <p className="text-muted m-0 text-[0.9rem]">Chưa có dữ liệu</p>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
