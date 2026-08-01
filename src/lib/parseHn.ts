import type { CurrentRow, StoreSnapshot } from '../types'
import {
  normalizeLabel,
  normalizeSourceUpdatedAt,
  normalizeToVndPerChi,
  parsePriceNumber,
} from './normalize'

function isHnNhan9999(label: string): boolean {
  const n = normalizeLabel(label)
  if (!n.includes('9999')) return false
  // Skip nữ trang / 990
  if (n.includes('nu trang') || n.includes('nữ trang') || n.includes('990')) return false
  return n.includes('nhan') || n.includes('nhẫn')
}

function extractUpdatedAt(doc: Document): string | undefined {
  const bodyText = doc.body?.textContent ?? ''
  const m = bodyText.match(/Cập nhật lúc:\s*(\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}(?::\d{2})?)/i)
  if (m) return m[1].trim()
  const m2 = bodyText.match(/(\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}(?::\d{2})?)/)
  if (m2) return m2[1].trim()
  return undefined
}

export function parseHn(html: string): StoreSnapshot {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const tables = Array.from(doc.querySelectorAll('table'))
  const rows: CurrentRow[] = []

  for (const table of tables) {
    const trs = Array.from(table.querySelectorAll('tr'))
    for (const tr of trs) {
      const cells = Array.from(tr.querySelectorAll('td')).map((td) =>
        (td.textContent ?? '').replace(/\s+/g, ' ').trim(),
      )
      if (cells.length < 3) continue

      const label = cells[0]
      if (!isHnNhan9999(label)) continue

      const buy = normalizeToVndPerChi(parsePriceNumber(cells[1]), 'hn')
      const sell = normalizeToVndPerChi(parsePriceNumber(cells[2]), 'hn')
      if (!buy && !sell) continue

      rows.push({
        kind: 'hn_nhan_9999',
        label,
        buy,
        sell,
      })
      break
    }
    if (rows.length) break
  }

  return {
    store: 'hn',
    sourceUpdatedAt: normalizeSourceUpdatedAt(extractUpdatedAt(doc)),
    fetchedAt: Date.now(),
    rows,
  }
}
