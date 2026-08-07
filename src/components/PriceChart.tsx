import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatVnd } from '../lib/normalize'

export type ChartSeries = {
  key: string
  name: string
  color: string
}

type Props = {
  data: Record<string, string | number>[]
  series: ChartSeries[]
  emptyMessage?: string
}

function formatTick(ts: number): string {
  const d = new Date(ts)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function formatTooltipLabel(ts: number): string {
  return new Date(ts).toLocaleString('vi-VN')
}

/** Padding as a fraction of the data span (keeps small swings readable). */
const Y_PAD_RATIO = 0.12
/** Floor pad when prices barely move (đồng). */
const Y_PAD_MIN = 30_000
/** When all values are equal, pad by this fraction of the value. */
const Y_FLAT_RATIO = 0.004

function yDomain(
  data: Record<string, string | number>[],
  series: ChartSeries[],
): [number, number] {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const row of data) {
    for (const s of series) {
      const v = Number(row[s.key])
      if (!Number.isFinite(v)) continue
      if (v < min) min = v
      if (v > max) max = v
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 0]

  const span = max - min
  const pad =
    span === 0
      ? Math.max(min * Y_FLAT_RATIO, Y_PAD_MIN)
      : Math.max(span * Y_PAD_RATIO, Y_PAD_MIN)

  const yMin = Math.max(0, min - pad)
  const yMax = max + pad
  return yMax > yMin ? [yMin, yMax] : [yMin, yMin + Y_PAD_MIN]
}

function formatYTick(v: number, yMin: number, yMax: number): string {
  const range = yMax - yMin
  const tr = v / 1_000_000
  if (range < 500_000) return `${tr.toFixed(2)}tr`
  if (range < 2_000_000) return `${tr.toFixed(1)}tr`
  return `${Math.round(tr)}tr`
}

export function PriceChart({
  data,
  series,
  emptyMessage = 'Chưa có dữ liệu biểu đồ',
}: Props) {
  if (!data.length) {
    return (
      <div className="border-line bg-chart-bg text-muted grid min-h-[180px] place-items-center rounded-xl border border-dashed p-4 text-center">
        {emptyMessage}
      </div>
    )
  }

  const [yMin, yMax] = yDomain(data, series)

  return (
    <div className="border-line bg-chart-bg min-h-80 w-full rounded-xl border px-1 pt-2 pb-1">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8dfd0" />
          <XAxis
            dataKey="ts"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatTick}
            stroke="#7a6a55"
            fontSize={12}
          />
          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={(v: number) => formatYTick(v, yMin, yMax)}
            stroke="#7a6a55"
            fontSize={12}
            width={52}
          />
          <Tooltip
            labelFormatter={(label) => formatTooltipLabel(Number(label))}
            formatter={(value) => formatVnd(Number(value ?? 0))}
            cursor={{ stroke: '#c4b49a', strokeDasharray: '4 4' }}
          />
          <Legend />
          {series.map((s) => (
            <Line
              key={s.key}
              type="linear"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              connectNulls
              // Line-only like Kitco / TradingView default — no fixed markers
              // (close vertices after collapse look cluttered on 30D). Detail via hover.
              dot={false}
              activeDot={{
                r: 6,
                fill: '#fffaf3',
                stroke: s.color,
                strokeWidth: 2,
              }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
