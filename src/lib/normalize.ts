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
export function normalizeToVndPerChi(value: number, store: 'hkn' | 'kkvh'): number {
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

export function formatDelta(value: number): string {
  if (!value) return '0đ'
  const sign = value > 0 ? '+' : ''
  return sign + formatVnd(value)
}

export function spread(buy: number, sell: number): number {
  if (!buy || !sell) return 0
  return sell - buy
}

export function spreadPercent(buy: number, sell: number): number {
  if (!buy || !sell) return 0
  return ((sell - buy) / buy) * 100
}

export function normalizeLabel(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/đ/gi, 'd')
    .trim()
    .toLowerCase()
}
