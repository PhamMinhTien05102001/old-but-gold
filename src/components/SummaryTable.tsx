import { useMemo } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { CurrentRow, PricePoint } from '../types'
import { previousPoint } from '../lib/history'
import { formatVnd } from '../lib/normalize'

export type SummaryRow = {
  storeId: string
  storeName: string
  buy: number
  sell: number
  kind: CurrentRow['kind']
}

type Props = {
  rows: SummaryRow[]
  history: PricePoint[]
  sourceUpdatedAt?: string
}

export function SummaryTable({ rows, history, sourceUpdatedAt }: Props) {
  const sorted = useMemo(
    () =>
      [...rows]
        .filter((r) => r.sell > 0 || r.buy > 0)
        .sort((a, b) => {
          const aPrice = a.sell || a.buy
          const bPrice = b.sell || b.buy
          return aPrice - bPrice
        }),
    [rows],
  )

  if (!sorted.length) {
    return <p className="text-muted m-0">Chưa có dữ liệu giá.</p>
  }

  const cheapestSell = Math.min(...sorted.map((r) => r.sell).filter((v) => v > 0))

  return (
    <section className="border-line bg-surface rounded-2xl border px-4 pt-4 pb-5 shadow-[0_18px_40px_rgba(26,20,16,0.18)] sm:px-[1.15rem]">
      <header className="mb-4">
        <h2 className="font-display mb-1 text-[1.45rem]">Tổng hợp giá hiện tại</h2>
        {sourceUpdatedAt ? (
          <p className="text-muted m-0">Nguồn cập nhật: {sourceUpdatedAt}</p>
        ) : null}
      </header>

      <div className="border-line overflow-x-auto rounded-xl border">
        <table className="w-full border-collapse text-[0.95rem]">
          <thead>
            <tr>
              <th className="border-line bg-table-head border-b px-3.5 py-2.5 text-left font-bold">
                Tên
              </th>
              <th className="border-line bg-table-head border-b px-3.5 py-2.5 text-left font-bold">
                Mua vào
              </th>
              <th className="border-line bg-table-head border-b px-3.5 py-2.5 text-left font-bold">
                Bán ra
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const isCheapest = row.sell > 0 && row.sell === cheapestSell
              const prev = previousPoint(history, row.kind)
              const delta = prev ? row.sell - prev.sell : 0

              return (
                <tr key={`${row.storeId}-${row.kind}`} className="last:[&>td]:border-b-0">
                  <td className="border-line border-b px-3.5 py-2.5 text-left">
                    <span className={isCheapest ? 'font-semibold' : undefined}>
                      {row.storeName}
                    </span>
                  </td>
                  <td className="border-line border-b px-3.5 py-2.5 text-left">
                    {formatVnd(row.buy)}
                  </td>
                  <td className="border-line border-b px-3.5 py-2.5 text-left">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span className={isCheapest ? 'text-up font-semibold' : undefined}>
                        {formatVnd(row.sell)}
                      </span>
                      {delta !== 0 ? (
                        <span
                          className={[
                            'inline-flex items-center gap-0.5 font-semibold',
                            delta > 0 ? 'text-up' : 'text-down',
                          ].join(' ')}
                        >
                          {delta > 0 ? (
                            <ArrowUp className="size-4 shrink-0" aria-hidden />
                          ) : (
                            <ArrowDown className="size-4 shrink-0" aria-hidden />
                          )}
                          {formatVnd(Math.abs(delta))}
                        </span>
                      ) : null}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
