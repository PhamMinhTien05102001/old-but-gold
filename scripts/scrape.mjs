/**
 * Scrape HKN + KKVH gold 9999 prices and write public/data/*.json
 * Used by GitHub Actions (no Vite proxy needed).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'public', 'data')

const HKN_URL = 'https://hoakimnguyen.com/tra-cuu-gia-vang/'
const KKVH_URL = 'https://kimkhanhviethung.vn/tra-cuu-gia-vang.html'

function parsePriceNumber(raw) {
  const cleaned = String(raw)
    .replace(/<[^>]*>/g, '')
    .replace(/[^\d.,]/g, '')
    .trim()
  if (!cleaned) return 0
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, ''))
  }
  return Number(cleaned.replace(/[.,]/g, '')) || 0
}

function normalizeHkn(value) {
  if (!value) return 0
  return value < 100_000 ? value * 1000 : value
}

function normalizeLabel(text) {
  return String(text).replace(/\s+/g, ' ').trim().toLowerCase()
}

function classifyHkn(label) {
  const n = normalizeLabel(label)
  if (!n.includes('9999')) return null
  if (n.includes('nhẫn') || n.includes('nhan')) return 'hkn_nhan_9999'
  return 'hkn_khau_9999'
}

function isKkvh9999(label) {
  const n = normalizeLabel(label)
  if (n.includes('ngoài') || n.includes('ngoai')) return false
  if (n.includes('999.9') || n.includes('999,9')) return true
  return false
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; OldButGoldBot/1.0; +https://github.com/PhamMinhTien05102001/old-but-got)',
      Accept: 'text/html,application/xhtml+xml',
    },
  })
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${url}`)
  return res.text()
}

function parseHkn(html) {
  const $ = cheerio.load(html)
  const rows = []
  const seen = new Set()
  let sourceUpdatedAt

  const timeText = $('.section-time').first().text()
  if (timeText) {
    sourceUpdatedAt = timeText.replace(/Cập nhật vào lúc:\s*/i, '').trim()
  }

  $('table tr').each((_, tr) => {
    const cells = $(tr)
      .find('td')
      .map((__, td) => $(td).text().replace(/\s+/g, ' ').trim())
      .get()
    if (cells.length < 3) return
    const kind = classifyHkn(cells[0])
    if (!kind || seen.has(kind)) return
    const buy = normalizeHkn(parsePriceNumber(cells[1]))
    const sell = normalizeHkn(parsePriceNumber(cells[2]))
    if (!buy && !sell) return
    seen.add(kind)
    rows.push({ kind, label: cells[0], buy, sell })
  })

  return {
    store: 'hkn',
    sourceUpdatedAt,
    fetchedAt: Date.now(),
    rows,
  }
}

function parseKkvh(html) {
  const $ = cheerio.load(html)
  const rows = []
  let sourceUpdatedAt

  const body = $('body').text()
  const m = body.match(/Ngày cập nhật:\s*([0-9/: ]+\d{4}\s*\d{0,2}:?\d{0,2}:?\d{0,2})/i)
  if (m) sourceUpdatedAt = m[1].trim()

  $('table tr').each((_, tr) => {
    if (rows.length) return false
    const cells = $(tr)
      .find('td')
      .map((__, td) => $(td).text().replace(/\s+/g, ' ').trim())
      .get()
    if (cells.length < 3) return
    if (!isKkvh9999(cells[0])) return
    const buy = parsePriceNumber(cells[1])
    const sell = parsePriceNumber(cells[2])
    if (!buy && !sell) return
    rows.push({ kind: 'kkvh_9999', label: cells[0], buy, sell })
  })

  return {
    store: 'kkvh',
    sourceUpdatedAt,
    fetchedAt: Date.now(),
    rows,
  }
}

function sameMinute(a, b) {
  return Math.floor(a / 60_000) === Math.floor(b / 60_000)
}

function appendHistory(history, snapshots, now) {
  const additions = []
  for (const snap of snapshots) {
    for (const row of snap.rows) {
      const last = [...history, ...additions].filter((p) => p.kind === row.kind).at(-1)
      if (
        last &&
        last.buy === row.buy &&
        last.sell === row.sell &&
        sameMinute(last.ts, now)
      ) {
        continue
      }
      // Also skip if price unchanged from last entry (even different minute) within same day optional?
      // Keep all price changes; skip only same-minute duplicates.
      additions.push({
        ts: now,
        store: snap.store,
        kind: row.kind,
        label: row.label,
        buy: row.buy,
        sell: row.sell,
        sourceUpdatedAt: snap.sourceUpdatedAt,
      })
    }
  }
  return [...history, ...additions]
}

async function loadJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return fallback
  }
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true })

  const [hknHtml, kkvhHtml] = await Promise.all([fetchText(HKN_URL), fetchText(KKVH_URL)])
  const hkn = parseHkn(hknHtml)
  const kkvh = parseKkvh(kkvhHtml)

  if (!hkn.rows.length) throw new Error('HKN: no 9999 rows')
  if (!kkvh.rows.length) throw new Error('KKVH: no 999.9 row')

  const now = Date.now()
  const latest = { fetchedAt: now, hkn, kkvh }
  const historyPath = path.join(DATA_DIR, 'history.json')
  const prevHistory = await loadJson(historyPath, [])
  const history = appendHistory(
    Array.isArray(prevHistory) ? prevHistory : [],
    [hkn, kkvh],
    now,
  )

  // Cap history size (~1 year of 30min samples is large; keep last 20k points)
  const capped = history.slice(-20_000)

  await writeFile(path.join(DATA_DIR, 'latest.json'), JSON.stringify(latest, null, 2))
  await writeFile(historyPath, JSON.stringify(capped, null, 2))

  console.log('Wrote public/data/latest.json and history.json')
  console.log('HKN rows:', hkn.rows)
  console.log('KKVH rows:', kkvh.rows)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
