/**
 * Per-store gold price scrape (HKN / KKVH / Hồng Ngọc, …).
 * - Heartbeat: GitHub Actions every 30m
 * - Config: scripts/stores/{id}.json (skip _*.json templates)
 * - Modes: adaptive (half/double X) | fixed (constant interval)
 * - Runtime state: public/data/schedule.json → stores.{id}
 * - Append history only when sourceUpdatedAt changes vs tip for that kind
 *
 * Usage:
 *   node scripts/scrape.mjs
 *   node scripts/scrape.mjs --force
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'public', 'data')
const STORES_DIR = path.join(__dirname, 'stores')
const SCHEDULE_PATH = path.join(DATA_DIR, 'schedule.json')

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

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** Canonical: `HH:mm:ss DD/MM/YYYY` (time then date). */
function normalizeSourceUpdatedAt(raw) {
  if (!raw) return undefined
  const s = String(raw).trim().replace(/\s+/g, ' ')

  let m = s.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*[, ]\s*(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  )
  if (m) {
    const [, h, mi, sec = '00', d, mo, y] = m
    return `${pad2(h)}:${pad2(mi)}:${pad2(sec)} ${pad2(d)}/${pad2(mo)}/${y}`
  }

  m = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[, ]\s*(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  )
  if (m) {
    const [, d, mo, y, h, mi, sec = '00'] = m
    return `${pad2(h)}:${pad2(mi)}:${pad2(sec)} ${pad2(d)}/${pad2(mo)}/${y}`
  }

  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (m) {
    const [, y, mo, d, h, mi, sec = '00'] = m
    return `${pad2(h)}:${pad2(mi)}:${pad2(sec)} ${pad2(d)}/${pad2(mo)}/${y}`
  }

  return s
}

function classifyHkn(label) {
  const n = normalizeLabel(label)
  if (!n.includes('9999')) return null
  if (n.includes('nhẫn') || n.includes('nhan')) return 'hkn_nhan_9999'
  return null
}

function isTrackedKind(kind) {
  return kind === 'hkn_nhan_9999' || kind === 'kkvh_9999' || kind === 'hn_nhan_9999'
}

function isKkvh9999(label) {
  const n = normalizeLabel(label)
  if (n.includes('ngoài') || n.includes('ngoai')) return false
  if (n.includes('999.9') || n.includes('999,9')) return true
  return false
}

function isHnNhan9999(label) {
  const n = normalizeLabel(label)
  if (!n.includes('9999')) return false
  if (n.includes('nu trang') || n.includes('nữ trang') || n.includes('990')) return false
  return n.includes('nhẫn') || n.includes('nhan')
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
    sourceUpdatedAt = normalizeSourceUpdatedAt(
      timeText.replace(/Cập nhật vào lúc:\s*/i, '').trim(),
    )
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
    if (!buy || !sell) return
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
  if (m) sourceUpdatedAt = normalizeSourceUpdatedAt(m[1].trim())

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
    if (!buy || !sell) return
    rows.push({ kind: 'kkvh_9999', label: cells[0], buy, sell })
  })

  return {
    store: 'kkvh',
    sourceUpdatedAt,
    fetchedAt: Date.now(),
    rows,
  }
}

function parseHn(html) {
  const $ = cheerio.load(html)
  const rows = []
  let sourceUpdatedAt

  const body = $('body').text()
  const m = body.match(/Cập nhật lúc:\s*(\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}(?::\d{2})?)/i)
  if (m) sourceUpdatedAt = normalizeSourceUpdatedAt(m[1].trim())

  $('table tr').each((_, tr) => {
    if (rows.length) return false
    const cells = $(tr)
      .find('td')
      .map((__, td) => $(td).text().replace(/\s+/g, ' ').trim())
      .get()
    if (cells.length < 3) return
    if (!isHnNhan9999(cells[0])) return
    const buy = parsePriceNumber(cells[1])
    const sell = parsePriceNumber(cells[2])
    if (!buy || !sell) return
    rows.push({ kind: 'hn_nhan_9999', label: cells[0], buy, sell })
  })

  return {
    store: 'hn',
    sourceUpdatedAt,
    fetchedAt: Date.now(),
    rows,
  }
}

/** Register new HTML parsers here when cloning a store with a new layout. */
const PARSERS = {
  hkn: parseHkn,
  kkvh: parseKkvh,
  hn: parseHn,
}

async function loadJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return fallback
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

function historyPath(storeId) {
  return path.join(DATA_DIR, 'history', storeId, 'history.json')
}

/**
 * Load store configs from scripts/stores/*.json (skip _prefix templates).
 * @returns {Promise<object[]>}
 */
async function loadStoreConfigs() {
  let names
  try {
    names = await readdir(STORES_DIR)
  } catch {
    throw new Error(`Missing store configs dir: ${STORES_DIR}`)
  }

  const configs = []
  for (const name of names.sort()) {
    if (!name.endsWith('.json') || name.startsWith('_')) continue
    const file = path.join(STORES_DIR, name)
    const raw = await loadJson(file, null)
    if (!raw || typeof raw !== 'object') {
      throw new Error(`Invalid store config: ${file}`)
    }
    if (!raw.id || !raw.url || !raw.parser || !raw.crawl?.mode) {
      throw new Error(`Store config missing id/url/parser/crawl.mode: ${file}`)
    }
    if (raw.crawl.mode !== 'adaptive' && raw.crawl.mode !== 'fixed') {
      throw new Error(`Unknown crawl.mode "${raw.crawl.mode}" in ${file}`)
    }
    if (!Number(raw.crawl.intervalMinutes)) {
      throw new Error(`crawl.intervalMinutes required in ${file}`)
    }
    if (raw.crawl.mode === 'adaptive') {
      if (!Number(raw.crawl.minIntervalMinutes) || !Number(raw.crawl.maxIntervalMinutes)) {
        throw new Error(`adaptive store needs min/maxIntervalMinutes: ${file}`)
      }
    }
    if (!PARSERS[raw.parser]) {
      throw new Error(`Unknown parser "${raw.parser}" in ${file} — register in PARSERS`)
    }
    configs.push(raw)
  }

  if (!configs.length) {
    throw new Error(`No store configs in ${STORES_DIR} (copy _template.json → {id}.json)`)
  }
  return configs
}

/**
 * In-memory state = policy from config + runtime from schedule.json.
 * Persisted runtime only: lastCrawlAt, nextCrawlAt, lastResult, lastChangedKinds,
 * status, rows, error?; adaptive also keeps live intervalMinutes (current X).
 */
function defaultStoreState(config, scheduleFile = null) {
  const crawl = config.crawl
  const mode = crawl.mode
  const base = {
    mode,
    intervalMinutes: Number(crawl.intervalMinutes),
    lastCrawlAt: null,
    nextCrawlAt: null,
    lastResult: 'init',
    lastChangedKinds: [],
    status: 'ok',
    rows: 0,
  }
  if (mode === 'adaptive') {
    base.minIntervalMinutes = Number(crawl.minIntervalMinutes)
    base.maxIntervalMinutes = Number(crawl.maxIntervalMinutes)
  }

  if (!scheduleFile || typeof scheduleFile !== 'object') return base

  const fromStores = scheduleFile.stores?.[config.id]
  if (fromStores && typeof fromStores === 'object') {
    return mergeRuntime(config, base, fromStores)
  }

  // Legacy flat schedule.json (single global X)
  if (scheduleFile.lastCrawlAt || scheduleFile.nextCrawlAt) {
    if (scheduleFile.lastCrawlAt) base.lastCrawlAt = scheduleFile.lastCrawlAt
    if (mode === 'adaptive') {
      if (Number(scheduleFile.intervalMinutes)) {
        base.intervalMinutes = Number(scheduleFile.intervalMinutes)
      }
      if (scheduleFile.nextCrawlAt) base.nextCrawlAt = scheduleFile.nextCrawlAt
    } else if (scheduleFile.lastCrawlAt) {
      const lastMs = toEpoch(scheduleFile.lastCrawlAt)
      if (lastMs != null) {
        base.nextCrawlAt = toIso(lastMs + base.intervalMinutes * 60_000)
      }
    }
  }

  const st = Array.isArray(scheduleFile.storeStatus)
    ? scheduleFile.storeStatus.find((s) => s.store === config.id)
    : null
  if (st?.status) base.status = st.status
  if (Number(st?.rows)) base.rows = Number(st.rows)

  return base
}

function mergeRuntime(config, base, runtime) {
  const out = { ...base }
  if (runtime.lastCrawlAt != null) out.lastCrawlAt = runtime.lastCrawlAt
  if (runtime.nextCrawlAt != null) out.nextCrawlAt = runtime.nextCrawlAt
  if (runtime.lastResult != null) out.lastResult = runtime.lastResult
  if (Array.isArray(runtime.lastChangedKinds)) {
    out.lastChangedKinds = runtime.lastChangedKinds
  }
  if (runtime.status != null) out.status = runtime.status
  if (runtime.rows != null) out.rows = Number(runtime.rows) || 0
  if (runtime.error != null) out.error = runtime.error
  // Live X only for adaptive (fixed always uses config.crawl.intervalMinutes)
  if (
    config.crawl.mode === 'adaptive' &&
    Number(runtime.intervalMinutes)
  ) {
    out.intervalMinutes = Number(runtime.intervalMinutes)
  }
  // Policy always from config (ignore stale mode/min/max in old schedule files)
  out.mode = config.crawl.mode
  if (config.crawl.mode === 'adaptive') {
    out.minIntervalMinutes = Number(config.crawl.minIntervalMinutes)
    out.maxIntervalMinutes = Number(config.crawl.maxIntervalMinutes)
  } else {
    delete out.minIntervalMinutes
    delete out.maxIntervalMinutes
    out.intervalMinutes = Number(config.crawl.intervalMinutes)
  }
  return out
}

/** Runtime slice written to schedule.json (no crawl policy duplication). */
function toPersistedRuntime(config, state) {
  const out = {
    lastCrawlAt: state.lastCrawlAt,
    nextCrawlAt: state.nextCrawlAt,
    lastResult: state.lastResult,
    lastChangedKinds: state.lastChangedKinds ?? [],
    status: state.status || 'ok',
    rows: Number(state.rows) || 0,
  }
  if (state.error) out.error = state.error
  if (config.crawl.mode === 'adaptive') {
    out.intervalMinutes =
      Number(state.intervalMinutes) || Number(config.crawl.intervalMinutes)
  }
  return out
}

/** Build runtime state map from schedule.json. */
async function loadAllStoreStates(configs, scheduleFile) {
  const states = new Map()
  for (const config of configs) {
    states.set(config.id, defaultStoreState(config, scheduleFile))
  }
  return states
}

function isDue(state, now) {
  if (force) return true
  const nextMs = toEpoch(state.nextCrawlAt)
  return nextMs == null || now >= nextMs
}

/** Last history point per kind (for adaptive X + crawl fallback). */
function lastPointsByKind(history) {
  const map = new Map()
  for (const p of history) {
    if (!isTrackedKind(p.kind)) continue
    map.set(p.kind, p)
  }
  return map
}

function snapshotFromHistory(store, history) {
  const points = history.filter((p) => p.store === store && isTrackedKind(p.kind))
  if (!points.length) return null
  const byKind = new Map()
  for (const p of points) byKind.set(p.kind, p)
  const rows = [...byKind.values()].map((p) => ({
    kind: p.kind,
    label: p.label,
    buy: p.buy,
    sell: p.sell,
  }))
  if (!rows.some((r) => Number(r.buy) > 0 && Number(r.sell) > 0)) return null
  let fetchedAt = 0
  let sourceUpdatedAt
  for (const p of byKind.values()) {
    fetchedAt = Math.max(fetchedAt, p.ts ?? 0)
    if (p.sourceUpdatedAt) sourceUpdatedAt = p.sourceUpdatedAt
  }
  return {
    store,
    sourceUpdatedAt,
    fetchedAt,
    rows: rows.filter((r) => Number(r.buy) > 0 && Number(r.sell) > 0),
  }
}

/** Kinds in snap whose buy/sell differ from previous history tip. */
function changedKindsForSnap(prevByKind, snap) {
  const changed = []
  for (const row of snap.rows) {
    const old = prevByKind.get(row.kind)
    if (!old || old.buy !== row.buy || old.sell !== row.sell) {
      changed.push(row.kind)
    }
  }
  return changed
}

/** Append only when shop sourceUpdatedAt differs from history tip (same kind). */
function historyEntriesFromSnaps(snaps, now, prevByKind) {
  const additions = []
  for (const snap of snaps) {
    const sourceUpdatedAt = normalizeSourceUpdatedAt(snap.sourceUpdatedAt)
    if (!sourceUpdatedAt) continue
    for (const row of snap.rows) {
      if (!isTrackedKind(row.kind)) continue
      const prev = prevByKind.get(row.kind)
      const prevSrc = normalizeSourceUpdatedAt(prev?.sourceUpdatedAt)
      if (prevSrc && prevSrc === sourceUpdatedAt) continue
      additions.push({
        ts: now,
        store: snap.store,
        kind: row.kind,
        label: row.label,
        buy: row.buy,
        sell: row.sell,
        sourceUpdatedAt,
      })
    }
  }
  return additions
}

function appendHistory(history, additions) {
  if (!additions.length) return history
  return [...history, ...additions].slice(-20_000)
}

async function loadAllHistory(storeIds) {
  const fromSplit = []
  for (const id of storeIds) {
    const list = await loadJson(historyPath(id), [])
    if (Array.isArray(list)) fromSplit.push(...list)
  }
  if (fromSplit.length) return fromSplit

  const legacy = await loadJson(path.join(DATA_DIR, 'history.json'), [])
  return Array.isArray(legacy) ? legacy : []
}

async function writeHistoryForStores(history, storeIds) {
  for (const store of storeIds) {
    await mkdir(path.join(DATA_DIR, 'history', store), { recursive: true })
    const list = history.filter((p) => p.store === store)
    await writeFile(historyPath(store), JSON.stringify(list, null, 2) + '\n')
  }
}

function hasValidRows(snap) {
  return Boolean(
    snap?.rows?.some((r) => Number(r.buy) > 0 && Number(r.sell) > 0),
  )
}

async function crawlSource(source, now) {
  const parser = PARSERS[source.parser]
  if (!parser) throw new Error(`Unknown parser: ${source.parser}`)
  const html = await fetchText(source.url)
  const snap = parser(html)
  if (!hasValidRows(snap)) {
    throw new Error('empty or invalid price cells')
  }
  snap.store = source.id
  snap.rows = snap.rows.filter((r) => Number(r.buy) > 0 && Number(r.sell) > 0)
  snap.fetchedAt = now
  return snap
}

function nextIntervalMinutes(config, state, priceChanged) {
  const crawl = config.crawl
  if (crawl.mode === 'fixed') {
    return Number(crawl.intervalMinutes)
  }
  const min = Number(crawl.minIntervalMinutes)
  const max = Number(crawl.maxIntervalMinutes)
  let interval = Number(state.intervalMinutes) || Number(crawl.intervalMinutes)
  if (priceChanged) {
    interval = clampInterval(Math.floor(interval / 2), min, max)
  } else {
    interval = clampInterval(interval * 2, min, max)
  }
  return interval
}

function statusEntryFromState(storeId, state) {
  const entry = {
    store: storeId,
    rows: Number(state.rows) || 0,
    status: state.status || 'ok',
  }
  if (state.error) entry.error = state.error
  return entry
}

function buildScheduleFile(configs, states) {
  const stores = {}
  for (const config of configs) {
    stores[config.id] = toPersistedRuntime(config, states.get(config.id))
  }
  return { stores }
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true })

  const configs = await loadStoreConfigs()
  const storeIds = configs.map((c) => c.id)
  const scheduleFile = await loadJson(SCHEDULE_PATH, null)

  const now = Date.now()
  const states = await loadAllStoreStates(configs, scheduleFile)

  const dueConfigs = configs.filter((c) => isDue(states.get(c.id), now))
  if (!dueConfigs.length) {
    const summary = configs.map((c) => {
      const st = states.get(c.id)
      const nextMs = toEpoch(st.nextCrawlAt)
      const waitMin =
        nextMs == null ? 0 : Math.max(0, Math.ceil((nextMs - now) / 60_000))
      return `${c.id}(~${waitMin}m,X=${st.intervalMinutes}m)`
    })
    console.log(`Skip crawl: no store due [${summary.join(', ')}]`)
    process.exit(0)
  }

  console.log(
    `Due stores: ${dueConfigs.map((c) => c.id).join(', ')}${force ? ' (forced)' : ''}`,
  )

  const prevHistory = await loadAllHistory(storeIds)
  const cleanedPrev = prevHistory.filter((p) => isTrackedKind(p.kind))
  const historyPruned = cleanedPrev.length !== prevHistory.length
  const prevByKind = lastPointsByKind(cleanedPrev)

  const crawlResults = await Promise.all(
    dueConfigs.map(async (source) => {
      try {
        const snap = await crawlSource(source, now)
        return { id: source.id, ok: true, snap }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.warn(`[${source.id}] crawl failed, keeping previous: ${message}`)
        return { id: source.id, ok: false, error: message }
      }
    }),
  )

  const freshSnaps = []
  let anyUsableAmongDue = false

  for (const result of crawlResults) {
    const config = dueConfigs.find((c) => c.id === result.id)
    const prevState = states.get(result.id)
    let status = 'failed'
    let rows = 0
    let error = result.error
    let snap = null

    if (result.ok) {
      snap = result.snap
      freshSnaps.push(snap)
      status = 'ok'
      rows = snap.rows.length
      error = undefined
      anyUsableAmongDue = true
    } else {
      const prev = snapshotFromHistory(result.id, cleanedPrev)
      if (hasValidRows(prev)) {
        status = 'fallback'
        rows = prev.rows.length
        anyUsableAmongDue = true
      } else {
        status = 'failed'
        rows = 0
      }
    }

    const changedKinds = snap ? changedKindsForSnap(prevByKind, snap) : []
    const priceChanged = changedKinds.length > 0
    const interval = nextIntervalMinutes(
      config,
      prevState,
      result.ok ? priceChanged : false,
    )

    const nextState = {
      mode: config.crawl.mode,
      intervalMinutes: interval,
      lastCrawlAt: toIso(now),
      nextCrawlAt: toIso(now + interval * 60_000),
      lastResult: result.ok ? (priceChanged ? 'changed' : 'unchanged') : status,
      lastChangedKinds: result.ok && priceChanged ? changedKinds : [],
      status,
      rows,
    }
    if (config.crawl.mode === 'adaptive') {
      nextState.minIntervalMinutes = Number(config.crawl.minIntervalMinutes)
      nextState.maxIntervalMinutes = Number(config.crawl.maxIntervalMinutes)
    }
    if (error) nextState.error = error

    states.set(result.id, nextState)
  }

  if (!anyUsableAmongDue) {
    throw new Error(
      'All due stores failed and no previous history to fall back to',
    )
  }

  const historyAdditions = historyEntriesFromSnaps(freshSnaps, now, prevByKind)
  const history = appendHistory(cleanedPrev, historyAdditions)

  await writeFile(
    SCHEDULE_PATH,
    JSON.stringify(buildScheduleFile(configs, states), null, 2) + '\n',
  )

  const touchedHistoryIds = new Set(historyAdditions.map((p) => p.store))
  if (historyPruned) {
    for (const id of storeIds) touchedHistoryIds.add(id)
  }
  if (touchedHistoryIds.size) {
    await writeHistoryForStores(history, [...touchedHistoryIds])
  }

  const storeStatus = configs.map((c) =>
    statusEntryFromState(c.id, states.get(c.id)),
  )

  console.log(
    JSON.stringify(
      {
        forced: force,
        due: dueConfigs.map((c) => c.id),
        historyAppended: historyAdditions.length,
        stores: storeStatus,
        schedules: Object.fromEntries(
          dueConfigs.map((c) => {
            const st = states.get(c.id)
            return [
              c.id,
              {
                mode: st.mode,
                intervalMinutes: st.intervalMinutes,
                nextCrawlAt: st.nextCrawlAt,
                lastResult: st.lastResult,
                lastChangedKinds: st.lastChangedKinds,
              },
            ]
          }),
        ),
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
