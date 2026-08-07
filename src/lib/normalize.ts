import type { StoreId } from '../types'

/** Parse Vietnamese-style price strings into VND numbers. */
export function parsePriceNumber(raw: string): number {
  const cleaned = raw
    .replace(/<[^>]*>/g, '')
    .replace(/[^\d.,]/g, '')
    .trim()

  if (!cleaned) return 0

  // "13.070.000" or "13.070.000đ" → dots as thousand separators
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, ''))
  }

  // "13070000" or "12920"
  const digits = cleaned.replace(/[.,]/g, '')
  return Number(digits) || 0
}

/** HKN lists prices in nghìn đồng (e.g. 12920 → 12_920_000). */
export function normalizeToVndPerChi(value: number, store: StoreId): number {
  if (!value) return 0
  if (store === 'hkn' && value > 0 && value < 100_000) {
    return value * 1000
  }
  return value
}

export function formatVnd(value: number): string {
  if (!value) return '—'
  return new Intl.NumberFormat('vi-VN').format(value) + 'đ'
}

/** Relative time from epoch ms: `x phút trước` (< 1h) or `x tiếng trước`. */
export function formatTimeAgo(ts: number, now = Date.now()): string {
  const diffMs = Math.max(0, now - ts)
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  return `${hours} tiếng trước`
}

/** Elapsed span between two times (no “trước”), e.g. `5 tiếng`, `40 phút`. */
export function formatElapsed(fromMs: number, toMs: number): string {
  const diffMs = Math.max(0, toMs - fromMs)
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'dưới 1 phút'
  if (minutes < 60) return `${minutes} phút`
  const hours = Math.floor(minutes / 60)
  return `${hours} tiếng`
}

function pad2(n: string | number): string {
  return String(n).padStart(2, '0')
}

/**
 * Canonical source timestamp: `HH:mm:ss DD/MM/YYYY` (time then date).
 * Accepts common crawl variants (HKN time-first, KKVH date-first).
 */
export function normalizeSourceUpdatedAt(raw?: string | null): string | undefined {
  if (!raw) return undefined
  const s = raw.trim().replace(/\s+/g, ' ')

  // HH:mm[:ss][, ]DD/MM/YYYY
  let m = s.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*[, ]\s*(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  )
  if (m) {
    const [, h, mi, sec = '00', d, mo, y] = m
    return `${pad2(h)}:${pad2(mi)}:${pad2(sec)} ${pad2(d)}/${pad2(mo)}/${y}`
  }

  // DD/MM/YYYY[, ]HH:mm[:ss]
  m = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[, ]\s*(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  )
  if (m) {
    const [, d, mo, y, h, mi, sec = '00'] = m
    return `${pad2(h)}:${pad2(mi)}:${pad2(sec)} ${pad2(d)}/${pad2(mo)}/${y}`
  }

  // YYYY-MM-DD[ T]HH:mm[:ss] (Mão Thiệt / ISO-like)
  m = s.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  )
  if (m) {
    const [, y, mo, d, h, mi, sec = '00'] = m
    return `${pad2(h)}:${pad2(mi)}:${pad2(sec)} ${pad2(d)}/${pad2(mo)}/${y}`
  }

  return s
}

/** Epoch ms for a canonical (or raw) sourceUpdatedAt string; null if unparseable. */
export function sourceUpdatedAtToMs(raw?: string | null): number | null {
  const n = normalizeSourceUpdatedAt(raw)
  if (!n) return null
  const m = n.match(/^(\d{2}):(\d{2}):(\d{2}) (\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const [, hh, mi, ss, dd, mo, yyyy] = m
  const ms = new Date(+yyyy, +mo - 1, +dd, +hh, +mi, +ss).getTime()
  return Number.isNaN(ms) ? null : ms
}

/** Shop update time when available; otherwise scrape/crawl `ts`. */
export function pointTimeMs(p: {
  ts: number
  sourceUpdatedAt?: string | null
}): number {
  return sourceUpdatedAtToMs(p.sourceUpdatedAt) ?? p.ts
}

export function normalizeLabel(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/đ/gi, 'd').trim().toLowerCase()
}
