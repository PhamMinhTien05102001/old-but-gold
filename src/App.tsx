import { NavLink, Outlet } from 'react-router-dom'
import { routes } from './routes.ts'

export default function App() {
  return (
    <div className="mx-auto max-w-[1100px] px-3.5 py-4 pb-8 sm:px-5 sm:py-6 sm:pb-12">
      <header className="text-cream mb-5">
        <p className="font-display text-gold mb-1.5 text-[0.95rem] tracking-[0.08em] uppercase">
          Old But Gold
        </p>
        <h1 className="font-display mb-2 text-[clamp(1.8rem,4vw,2.6rem)] font-bold">
          Theo dõi giá vàng 9999
        </h1>
        <p className="text-sand m-0 max-w-2xl">
          Hoa Kim Nguyên & Kim Khánh Việt Hùng — bảng giá, chênh mua/bán, biểu đồ lịch sử
          tự tích lũy.
        </p>
      </header>

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

      <footer className="text-footer mt-5 text-[0.88rem]">
        <p>
          Giá chỉ mang tính tham khảo. Local: Vite proxy. GitHub Pages: dữ liệu từ Actions
          scrape (<code className="text-gold">public/data/latest/</code>).
        </p>
      </footer>
    </div>
  )
}
