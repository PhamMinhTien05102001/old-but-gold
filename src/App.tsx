import { NavLink, Outlet } from 'react-router-dom'
import { CircleAlert } from 'lucide-react'
import { routes } from './routes.ts'
import { useGoldPrices } from './context/GoldPricesContext.tsx'
import { isStoreUnhealthy } from './lib/stores.ts'
import type { StoreId } from './types.ts'

function routeNeedsAlert(
  routeId: string,
  storeStatus: Record<StoreId, string>,
): boolean {
  if (routeId === 'summary') {
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
  const { storeStatus } = useGoldPrices()

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
        <Outlet />
      </main>
    </div>
  )
}
