import type { CurrentRow, StoreSnapshot } from '../types'
import { normalizeLabel, normalizeToVndPerChi, parsePriceNumber } from './normalize'

function isKkvh9999(label: string): boolean {
  const n = normalizeLabel(label)
  // Exact-ish: "Vàng 999.9" — exclude "NL Ngoài 9999/999"
  if (n.includes('ngoai') || n.includes('ngoài')) return false
  if (n.includes('999.9') || n.includes('999,9')) return true
  // Some pages write "Vàng 9999" without the dot
  if (/(^|\s)vang\s+9999(\s|$)/.test(n) || /(^|\s)vàng\s+9999(\s|$)/.test(n)) return true
  return false
}

function extractUpdatedAt(doc: Document): string | undefined {
  const bodyText = doc.body?.textContent ?? ''
  const m = bodyText.match(
    /Ngày cập nhật:\s*([0-9/: ]+\d{4}\s*\d{0,2}:?\d{0,2}:?\d{0,2})/i,
  )
  if (m) return m[1].trim()
  const m2 = bodyText.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/)
  if (m2) return m2[1].trim()
  return undefined
}

export function parseKkvh(html: string): StoreSnapshot {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const tables = Array.from(
    doc.querySelectorAll('table.table, .table_goldprice table, table'),
  )
  const rows: CurrentRow[] = []

  for (const table of tables) {
    const trs = Array.from(table.querySelectorAll('tr'))
    for (const tr of trs) {
      const cells = Array.from(tr.querySelectorAll('td')).map((td) =>
        (td.textContent ?? '').replace(/\s+/g, ' ').trim(),
      )
      if (cells.length < 3) continue

      const label = cells[0]
      if (!isKkvh9999(label)) continue

      const buy = normalizeToVndPerChi(parsePriceNumber(cells[1]), 'kkvh')
      const sell = normalizeToVndPerChi(parsePriceNumber(cells[2]), 'kkvh')
      if (!buy && !sell) continue

      rows.push({
        kind: 'kkvh_9999',
        label,
        buy,
        sell,
      })
      break
    }
    if (rows.length) break
  }

  return {
    store: 'kkvh',
    sourceUpdatedAt: extractUpdatedAt(doc),
    fetchedAt: Date.now(),
    rows,
  }
}
