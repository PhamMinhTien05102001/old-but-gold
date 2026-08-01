/**
 * Adaptive scrape for HKN + KKVH gold 9999 prices.
 * - Heartbeat: GitHub Actions every 30m
 * - Interval X: default/max 120m, min 30m; half on change, double on stable
 * - history.json: append only when buy/sell changes
 *
 * Usage:
 *   node scripts/scrape.mjs
 *   node scripts/scrape.mjs --force
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'public', 'data')
const SOURCES_PATH = path.join(__dirname, 'sources.json')

const MIN_INTERVAL = 30
const MAX_INTERVAL = 120
const DEFAULT_INTERVAL = 120

const force = process.argv.includes('--force')

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
  // Only track nhẫn 9999 — skip khâu/vĩ and other 9999 variants
  if (n.includes('nhẫn') || n.includes('nhan')) return 'hkn_nhan_9999'
  return null
}

function isTrackedKind(kind) {
  return kind === 'hkn_nhan_9999' || kind === 'kkvh_9999'
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

const PARSERS = {
  hkn: parseHkn,
  kkvh: parseKkvh,
}

async function loadJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return fallback
  }
}

function defaultSchedule() {
  return {
    intervalMinutes: DEFAULT_INTERVAL,
    minIntervalMinutes: MIN_INTERVAL,
    maxIntervalMinutes: MAX_INTERVAL,
    lastCrawlAt: null,
    nextCrawlAt: null,
    lastResult: 'init',
  }
}

/** Accept ISO string or epoch ms; return ms or null. */
function toEpoch(value) {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const ms = Date.parse(String(value))
  return Number.isNaN(ms) ? null : ms
}

function toIso(ms) {
  return new Date(ms).toISOString()
}

function clampInterval(minutes, min, max) {
  return Math.min(max, Math.max(min, minutes))
}

function collectRows(latest) {
  if (!latest) return []
  const rows = []
  for (const key of Object.keys(latest)) {
    if (key === 'fetchedAt') continue
    const snap = latest[key]
    if (snap?.rows) rows.push(...snap.rows)
  }
  return rows
}

function rowMap(rows) {
  const map = new Map()
  for (const row of rows) {
    map.set(row.kind, row)
  }
  return map
}

/** Returns kinds whose buy/sell differ from previous latest. */
function changedKinds(prevLatest, nextSnapshots) {
  const prev = rowMap(collectRows(prevLatest))
  const changed = []
  for (const snap of nextSnapshots) {
    for (const row of snap.rows) {
      const old = prev.get(row.kind)
      if (!old || old.buy !== row.buy || old.sell !== row.sell) {
        changed.push({ snap, row })
      }
    }
  }
  return changed
}

function appendChangedHistory(history, changed, now) {
  const additions = changed.map(({ snap, row }) => ({
    ts: now,
    store: snap.store,
    kind: row.kind,
    label: row.label,
    buy: row.buy,
    sell: row.sell,
    sourceUpdatedAt: snap.sourceUpdatedAt,
  }))
  return [...history, ...additions].slice(-20_000)
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true })

  const schedulePath = path.join(DATA_DIR, 'schedule.json')
  const latestPath = path.join(DATA_DIR, 'latest.json')
  const historyPath = path.join(DATA_DIR, 'history.json')

  const schedule = {
    ...defaultSchedule(),
    ...(await loadJson(schedulePath, {})),
  }
  schedule.minIntervalMinutes = MIN_INTERVAL
  schedule.maxIntervalMinutes = MAX_INTERVAL

  const now = Date.now()
  const nextCrawlMs = toEpoch(schedule.nextCrawlAt)
  const due = force || nextCrawlMs == null || now >= nextCrawlMs

  if (!due) {
    const waitMin = Math.ceil((nextCrawlMs - now) / 60_000)
    console.log(
      `Skip crawl: not due yet (next in ~${waitMin}m, X=${schedule.intervalMinutes}m, nextCrawlAt=${toIso(nextCrawlMs)})`,
    )
    process.exit(0)
  }

  const { sources } = await loadJson(SOURCES_PATH, { sources: [] })
  if (!sources.length) throw new Error('No sources in scripts/sources.json')

  const snapshots = await Promise.all(
    sources.map(async (source) => {
      const parser = PARSERS[source.parser]
      if (!parser) throw new Error(`Unknown parser: ${source.parser}`)
      const html = await fetchText(source.url)
      const snap = parser(html)
      if (!snap.rows.length) {
        throw new Error(`${source.id}: no gold 9999 rows parsed`)
      }
      snap.fetchedAt = now
      return snap
    }),
  )

  const prevLatest = await loadJson(latestPath, null)
  const changed = changedKinds(prevLatest, snapshots)
  const priceChanged = changed.length > 0

  let interval = Number(schedule.intervalMinutes) || DEFAULT_INTERVAL
  if (priceChanged) {
    interval = clampInterval(
      Math.floor(interval / 2),
      schedule.minIntervalMinutes,
      schedule.maxIntervalMinutes,
    )
  } else {
    interval = clampInterval(
      interval * 2,
      schedule.minIntervalMinutes,
      schedule.maxIntervalMinutes,
    )
  }

  const latest = { fetchedAt: now }
  for (const snap of snapshots) {
    latest[snap.store] = snap
  }

  const rawHistory = await loadJson(historyPath, [])
  const prevHistory = Array.isArray(rawHistory) ? rawHistory : []
  const cleanedPrev = prevHistory.filter((p) => isTrackedKind(p.kind))
  const historyPruned = cleanedPrev.length !== prevHistory.length
  const history = priceChanged
    ? appendChangedHistory(cleanedPrev, changed, now)
    : cleanedPrev

  const nextCrawlAtMs = now + interval * 60_000
  const nextSchedule = {
    intervalMinutes: interval,
    minIntervalMinutes: schedule.minIntervalMinutes,
    maxIntervalMinutes: schedule.maxIntervalMinutes,
    lastCrawlAt: toIso(now),
    nextCrawlAt: toIso(nextCrawlAtMs),
    lastResult: priceChanged ? 'changed' : 'unchanged',
    lastChangedKinds: priceChanged ? changed.map((c) => c.row.kind) : [],
  }

  await writeFile(latestPath, JSON.stringify(latest, null, 2) + '\n')
  await writeFile(schedulePath, JSON.stringify(nextSchedule, null, 2) + '\n')
  if (priceChanged || historyPruned) {
    await writeFile(historyPath, JSON.stringify(history, null, 2) + '\n')
  }

  console.log(
    JSON.stringify(
      {
        forced: force,
        priceChanged,
        changedKinds: nextSchedule.lastChangedKinds,
        intervalMinutes: interval,
        nextCrawlAt: nextSchedule.nextCrawlAt,
        historyAppended: priceChanged ? changed.length : 0,
        stores: snapshots.map((s) => ({ store: s.store, rows: s.rows.length })),
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
