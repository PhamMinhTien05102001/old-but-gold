import { NavLink, Outlet } from 'react-router-dom'
import { routes } from './routes.ts'

export default function App() {
  return (
    <div className="mx-auto max-w-[1100px] px-3.5 py-4 pb-8 sm:px-5 sm:py-6 sm:pb-12">
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Chọn nguồn">
        {routes.map((route) => (
          <NavLink
            key={route.id}
            to={route.path}
            end={route.path === '/'}
            className={({ isActive }) =>
              [
                'rounded-full border px-3.5 py-2.5 font-semibold transition-colors',
                isActive
                  ? 'border-surface bg-surface text-ink'
                  : 'border-gold/35 hover:border-gold/60 bg-[#2a2118]/65 text-[#f0e2cf]',
              ].join(' ')
            }
          >
            {route.label}
          </NavLink>
        ))}
      </nav>

      <main>
        <Outlet />
      </main>
    </div>
  )
}
