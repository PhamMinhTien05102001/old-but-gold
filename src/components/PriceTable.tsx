import type { CurrentRow } from '../types'
import { formatVnd } from '../lib/normalize'

type Props = {
  rows: CurrentRow[]
}

export function PriceTable({ rows }: Props) {
  return (
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
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.kind} className="last:[&>td]:border-b-0">
              <td className="border-line border-b px-3.5 py-2.5 text-left">{row.label}</td>
              <td className="border-line border-b px-3.5 py-2.5 text-left">
                {formatVnd(row.buy)}
              </td>
              <td className="border-line border-b px-3.5 py-2.5 text-left">
                {formatVnd(row.sell)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
