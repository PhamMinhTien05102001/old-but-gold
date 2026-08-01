import type { ChartRange } from '../types'

const RANGES: ChartRange[] = ['1D', '7D', '30D', '3M', 'All']

type Props = {
  value: ChartRange
  onChange: (range: ChartRange) => void
}

export function RangeFilter({ value, onChange }: Props) {
  return (
    <div className="range-filter" role="group" aria-label="Khoảng thời gian">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          className={value === r ? 'range-btn active' : 'range-btn'}
          onClick={() => onChange(r)}
        >
          {r}
        </button>
      ))}
    </div>
  )
}
