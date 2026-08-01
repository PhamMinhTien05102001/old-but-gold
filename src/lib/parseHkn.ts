import type { CurrentRow, StoreSnapshot } from '../types'
import { normalizeLabel, normalizeToVndPerChi, parsePriceNumber } from './normalize'

function classifyHknLabel(label: string): CurrentRow['kind'] | null {
  const n = normalizeLabel(label)
  if (!n.includes('9999')) return null
  // Prefer nhẫn khâu over generic khâu
  if (n.includes('nhan') || n.includes('nhẫn')) return 'hkn_nhan_9999'
  if (n.includes('khau') || n.includes('khâu') || n.includes('vi')) return 'hkn_khau_9999'
  return 'hkn_khau_9999'
}

function extractUpdatedAt(doc: Document): string | undefined {
  const timeEl = doc.querySelector('.section-time, p.section-time')
  if (timeEl?.textContent) {
    const m = timeEl.textContent.match(
      /(\d{1,2}:\d{2}:\d{2}.+\d{2}\/\d{2}\/\d{4}|\d{1,2}:\d{2}:\d{2},\s*\d{2}\/\d{2}\/\d{4})/,
    )
    if (m) return m[1].trim()
    const cleaned = timeEl.textContent.replace(/Cập nhật vào lúc:\s*/i, '').trim()
    if (cleaned) return cleaned
  }
  return undefined
}

export function parseHkn(html: string): StoreSnapshot {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const tables = Array.from(doc.querySelectorAll('table'))
  const rows: CurrentRow[] = []
  const seen = new Set<string>()

  for (const table of tables) {
    const trs = Array.from(table.querySelectorAll('tr'))
    for (const tr of trs) {
      const cells = Array.from(tr.querySelectorAll('td')).map((td) =>
        (td.textContent ?? '').replace(/\s+/g, ' ').trim(),
      )
      if (cells.length < 3) continue

      const label = cells[0]
      const kind = classifyHknLabel(label)
      if (!kind) continue
      if (seen.has(kind)) continue

      const buy = normalizeToVndPerChi(parsePriceNumber(cells[1]), 'hkn')
      const sell = normalizeToVndPerChi(parsePriceNumber(cells[2]), 'hkn')
      if (!buy && !sell) continue

      seen.add(kind)
      rows.push({ kind, label, buy, sell })
    }
  }

  return {
    store: 'hkn',
    sourceUpdatedAt: extractUpdatedAt(doc),
    fetchedAt: Date.now(),
    rows,
  }
}
