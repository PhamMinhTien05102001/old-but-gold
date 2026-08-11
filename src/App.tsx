import { NavLink, Outlet } from 'react-router-dom'
import { CircleAlert } from 'lucide-react'
import { routes } from './routes.ts'
import { useGoldPrices } from './context/GoldPricesContext.tsx'
import { isStoreUnhealthy } from './lib/stores.ts'
import type { StoreId } from './types.ts'
import { PageSkeleton } from './components/PageSkeleton.tsx'

function routeNeedsAlert(
  routeId: string,
  storeStatus: Record<StoreId, string>,
): boolean {
  if (routeId === 'summary' || routeId === 'crawl') {
    return (['hkn', 'kkvh', 'hn'] as StoreId[]).some((id) =>
      isStoreUnhealthy(storeStatus[id] as 'ok' | 'fallback' | 'failed'),
    )
  }
  if (routeId === 'hkn' || routeId === 'kkvh' || routeId === 'hn') {
    return isStoreUnhealthy(storeStatus[routeId] as 'ok' | 'fallback' | 'failed')
  }
  return false
}

export default function App() {
  const { status, error, storeStatus } = useGoldPrices()

  return (
    <div className="mx-auto max-w-[1100px] px-3.5 py-4 pb-8 sm:px-5 sm:py-6 sm:pb-12">
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Chọn nguồn">
        {routes.map((route) => {
          const alert = routeNeedsAlert(route.id, storeStatus)
          return (
            <NavLink
              key={route.id}
              to={route.path}
              end={route.path === '/'}
              className={({ isActive }) =>
                [
                  'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2.5 font-semibold transition-colors',
                  isActive
                    ? 'border-surface bg-surface text-ink'
                    : 'border-gold/35 hover:border-gold/60 bg-[#2a2118]/65 text-[#f0e2cf]',
                ].join(' ')
              }
            >
              {route.label}
              {alert ? (
                <CircleAlert
                  className="size-4 shrink-0 text-[#ef4444]"
                  aria-label="Dữ liệu có vấn đề"
                />
              ) : null}
            </NavLink>
          )
        })}
      </nav>

      <main>
        {status === 'loading' ? (
          <PageSkeleton />
        ) : status === 'error' ? (
          <section className="border-line bg-surface rounded-2xl border px-4 py-5 shadow-[0_18px_40px_rgba(26,20,16,0.18)] sm:px-[1.15rem]">
            <h2 className="font-display mb-2 text-[1.25rem] text-[#991b1b]">
              Không tải được dữ liệu
            </h2>
            <p className="text-muted m-0 text-[0.95rem]">{error ?? 'Vui lòng thử lại sau.'}</p>
          </section>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  )
}
