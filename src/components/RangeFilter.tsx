import type { ChartRange } from '../types'

const RANGES: ChartRange[] = ['1D', '7D', '30D', '3M', 'All']

type Props = {
  value: ChartRange
  onChange: (range: ChartRange) => void
}

export function RangeFilter({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Khoảng thời gian">
      {RANGES.map((r) => {
        const active = value === r
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className={[
              'cursor-pointer rounded-lg border px-2.5 py-1.5 text-[0.85rem] font-semibold',
              active
                ? 'border-accent bg-accent text-[#fff8ef]'
                : 'border-line bg-chart-bg text-ink',
            ].join(' ')}
          >
            {r}
          </button>
        )
      })}
    </div>
  )
}
