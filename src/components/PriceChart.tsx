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

export function PriceChart({ data, series, emptyMessage = 'Chưa có dữ liệu biểu đồ' }: Props) {
  if (!data.length) {
    return <div className="chart-empty">{emptyMessage}</div>
  }

  return (
    <div className="chart-wrap">
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
            tickFormatter={(v: number) => `${Math.round(v / 1_000_000)}tr`}
            stroke="#7a6a55"
            fontSize={12}
            width={48}
          />
          <Tooltip
            labelFormatter={(label) => formatTooltipLabel(Number(label))}
            formatter={(value) => formatVnd(Number(value ?? 0))}
          />
          <Legend />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              dot={false}
              strokeWidth={2}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
