import { useState } from 'react'
import type { ChartRange, ChartTimeFilter } from '../types'
import {
  clampYmdToToday,
  formatTimeFilterLabel,
  todayYmd,
} from '../lib/history'

const RANGES: ChartRange[] = ['1D', '7D', '30D', '3M', 'All']

type CustomKind = 'day' | 'range'

type Props = {
  value: ChartTimeFilter
  onChange: (filter: ChartTimeFilter) => void
}

function btnClass(active: boolean): string {
  return [
    'cursor-pointer rounded-lg border px-2.5 py-1.5 text-[0.85rem] font-semibold',
    active
      ? 'border-accent bg-accent text-[#fff8ef]'
      : 'border-line bg-chart-bg text-ink',
  ].join(' ')
}

const inputClass =
  'border-line bg-chart-bg text-ink rounded-lg border px-2 py-1.5 text-[0.85rem]'

function emitRange(
  from: string,
  to: string,
  onChange: (filter: ChartTimeFilter) => void,
) {
  const nextFrom = from || null
  const nextTo = to || null
  if (!nextFrom && !nextTo) return
  onChange({ mode: 'range', from: nextFrom, to: nextTo })
}

export function RangeFilter({ value, onChange }: Props) {
  const maxDay = todayYmd()
  const isCustom = value.mode === 'day' || value.mode === 'range'
  const [panelOpen, setPanelOpen] = useState(isCustom)
  const [customKind, setCustomKind] = useState<CustomKind>(
    value.mode === 'range' ? 'range' : 'day',
  )
  const [day, setDay] = useState(
    value.mode === 'day' ? clampYmdToToday(value.day) : maxDay,
  )
  const [from, setFrom] = useState(
    value.mode === 'range' && value.from ? value.from : '',
  )
  const [to, setTo] = useState(
    value.mode === 'range' && value.to ? value.to : '',
  )

  function selectPreset(range: ChartRange) {
    setPanelOpen(false)
    onChange({ mode: 'preset', range })
  }

  function openCustom() {
    setPanelOpen(true)
    if (customKind === 'day') {
      onChange({ mode: 'day', day: clampYmdToToday(day || maxDay) })
      return
    }
    // Default open range: from = today, to empty → today → now
    const nextFrom = from || maxDay
    const nextTo = to
    if (!from) setFrom(nextFrom)
    emitRange(nextFrom, nextTo, onChange)
  }

  function applyDay(next: string) {
    if (!next) return
    const clamped = clampYmdToToday(next)
    setDay(clamped)
    setCustomKind('day')
    onChange({ mode: 'day', day: clamped })
  }

  function applyFrom(next: string) {
    let nextFrom = next
    if (nextFrom) {
      nextFrom = clampYmdToToday(nextFrom)
      if (to && nextFrom > to) nextFrom = to
    } else if (!to) {
      // Keep at least one bound — default from = today → now
      nextFrom = maxDay
    }
    setFrom(nextFrom)
    setCustomKind('range')
    emitRange(nextFrom, to, onChange)
  }

  function applyTo(next: string) {
    let nextTo = next
    if (nextTo) {
      nextTo = clampYmdToToday(nextTo)
      if (from && nextTo < from) nextTo = from
    } else if (!from) {
      setFrom(maxDay)
      setTo('')
      setCustomKind('range')
      emitRange(maxDay, '', onChange)
      return
    }
    setTo(nextTo)
    setCustomKind('range')
    emitRange(from, nextTo, onChange)
  }

  function switchKind(kind: CustomKind) {
    setCustomKind(kind)
    if (kind === 'day') {
      const next = clampYmdToToday(day || maxDay)
      setDay(next)
      onChange({ mode: 'day', day: next })
      return
    }
    const nextFrom = from || maxDay
    if (!from) setFrom(nextFrom)
    emitRange(nextFrom, to, onChange)
  }

  const fromMax = to && to < maxDay ? to : maxDay
  const toMin = from || undefined

  return (
    <div className="flex max-w-full flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-1.5" role="group" aria-label="Khoảng thời gian">
        {RANGES.map((r) => {
          const active = value.mode === 'preset' && value.range === r
          return (
            <button
              key={r}
              type="button"
              onClick={() => selectPreset(r)}
              className={btnClass(active)}
            >
              {r}
            </button>
          )
        })}
        <button
          type="button"
          onClick={openCustom}
          className={btnClass(isCustom)}
          aria-expanded={panelOpen}
          aria-controls="range-filter-custom"
        >
          Tuỳ chọn
          {isCustom ? ` · ${formatTimeFilterLabel(value)}` : ''}
        </button>
      </div>

      {panelOpen ? (
        <div
          id="range-filter-custom"
          className="border-line bg-chart-bg flex flex-wrap items-center justify-end gap-2 rounded-xl border px-2.5 py-2"
        >
          <div className="flex gap-1" role="group" aria-label="Chế độ tuỳ chọn">
            <button
              type="button"
              onClick={() => switchKind('day')}
              className={btnClass(customKind === 'day')}
            >
              Ngày
            </button>
            <button
              type="button"
              onClick={() => switchKind('range')}
              className={btnClass(customKind === 'range')}
            >
              Khoảng
            </button>
          </div>

          {customKind === 'day' ? (
            <label className="text-muted flex items-center gap-1.5 text-[0.85rem]">
              <span className="sr-only">Chọn ngày</span>
              <input
                type="date"
                value={day}
                max={maxDay}
                onChange={(e) => applyDay(e.target.value)}
                className={inputClass}
              />
            </label>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <label className="text-muted flex items-center gap-1.5 text-[0.85rem]">
                <span>Từ</span>
                <input
                  type="date"
                  value={from}
                  max={fromMax}
                  onChange={(e) => applyFrom(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="text-muted flex items-center gap-1.5 text-[0.85rem]">
                <span>Đến</span>
                <input
                  type="date"
                  value={to}
                  min={toMin}
                  max={maxDay}
                  onChange={(e) => applyTo(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
