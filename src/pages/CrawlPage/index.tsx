import type { StoreId } from '../../types'
import { useGoldPrices } from '../../context/GoldPricesContext.tsx'
import { formatTimeAgo } from '../../lib/normalize'
import {
  CRAWL_POLICY,
  kindShortLabel,
  STORE_META,
  isStoreUnhealthy,
  storeHealthLabel,
  type CrawlPolicy,
  type StoreScheduleRuntime,
} from '../../lib/stores'

const STORE_ORDER: StoreId[] = ['hkn', 'kkvh', 'hn']

function parseIsoMs(raw?: string | null): number | null {
  if (!raw) return null
  const ms = Date.parse(raw)
  return Number.isNaN(ms) ? null : ms
}

function formatAbsolute(ms: number): string {
  return new Date(ms).toLocaleString('vi-VN')
}

function policyLabel(policy: CrawlPolicy): string {
  if (policy.mode === 'fixed') {
    return `Cố định · mỗi ${policy.intervalMinutes} phút`
  }
  return `Adaptive · ${policy.minIntervalMinutes}–${policy.maxIntervalMinutes} phút`
}

function cycleLabel(policy: CrawlPolicy, runtime: StoreScheduleRuntime): string {
  if (policy.mode === 'fixed') {
    return `${policy.intervalMinutes} phút`
  }
  const x = runtime.intervalMinutes ?? policy.intervalMinutes
  return `X = ${x} phút`
}

function lastResultLabel(runtime: StoreScheduleRuntime): string {
  const result = runtime.lastResult
  if (!result || result === 'init') return '—'
  if (result === 'changed') {
    const kinds = runtime.lastChangedKinds?.map(kindShortLabel) ?? []
    return kinds.length ? `Đổi giá · ${kinds.join(', ')}` : 'Đổi giá'
  }
  if (result === 'unchanged') return 'Giá đứng'
  if (result === 'fallback') return 'Fallback'
  if (result === 'failed') return 'Lỗi crawl'
  return result
}

export function CrawlPage() {
  const { scheduleStores, storeStatus } = useGoldPrices()
  const now = Date.now()

  return (
    <section className="border-line bg-surface rounded-2xl border px-4 pt-4 pb-5 shadow-[0_18px_40px_rgba(26,20,16,0.18)] sm:px-[1.15rem]">
      <header className="mb-4">
        <h2 className="font-display mb-1 text-[1.45rem]">Lịch crawl</h2>
      </header>

      <div className="border-line overflow-x-auto rounded-xl border">
        <table className="w-full min-w-180 border-collapse text-[0.95rem]">
          <thead>
            <tr>
              <th className="border-line bg-table-head border-b px-3.5 py-2.5 text-left font-bold">
                Tiệm
              </th>
              <th className="border-line bg-table-head border-b px-3.5 py-2.5 text-left font-bold">
                Health
              </th>
              <th className="border-line bg-table-head border-b px-3.5 py-2.5 text-left font-bold">
                Chế độ
              </th>
              <th className="border-line bg-table-head border-b px-3.5 py-2.5 text-left font-bold">
                Chu kỳ
              </th>
              <th className="border-line bg-table-head border-b px-3.5 py-2.5 text-left font-bold">
                Crawl gần nhất
              </th>
              <th className="border-line bg-table-head border-b px-3.5 py-2.5 text-left font-bold">
                Lần trước
              </th>
            </tr>
          </thead>
          <tbody>
            {STORE_ORDER.map((id) => {
              const meta = STORE_META[id]
              const policy = CRAWL_POLICY[id]
              const runtime = scheduleStores[id] ?? {}
              const health = storeStatus[id] ?? runtime.status ?? 'ok'
              const unhealthy = isStoreUnhealthy(health)
              const lastMs = parseIsoMs(runtime.lastCrawlAt)

              return (
                <tr key={id} className="border-line border-b last:border-b-0">
                  <td className="px-3.5 py-3 align-top">
                    <div className="font-semibold">{meta.label}</div>
                    <a
                      href={meta.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted mt-0.5 block text-[0.85rem] break-all underline"
                    >
                      Nguồn
                    </a>
                  </td>
                  <td className="px-3.5 py-3 align-top">
                    <span
                      className={unhealthy ? 'font-semibold text-[#991b1b]' : 'text-ink'}
                    >
                      {storeHealthLabel(health)}
                    </span>
                    {runtime.error ? (
                      <span className="text-muted mt-0.5 block text-[0.85rem]">
                        {runtime.error}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3.5 py-3 align-top">{policyLabel(policy)}</td>
                  <td className="px-3.5 py-3 align-top">{cycleLabel(policy, runtime)}</td>
                  <td className="px-3.5 py-3 align-top">
                    {lastMs != null ? (
                      <span>
                        {formatTimeAgo(lastMs, now)}
                        <span className="text-muted mt-0.5 block text-[0.85rem]">
                          {formatAbsolute(lastMs)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3.5 py-3 align-top">{lastResultLabel(runtime)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
