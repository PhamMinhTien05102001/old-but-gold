import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { GoldPricesProvider } from './context/GoldPricesContext.tsx'
import { routes } from './routes.ts'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <GoldPricesProvider>
        <Routes>
          <Route path="/" element={<App />}>
            {routes.map((route) => (
              <Route
                key={route.id}
                index={route.path === '/'}
                path={route.path === '/' ? undefined : route.path.slice(1)}
                element={<route.Component />}
              />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </GoldPricesProvider>
    </BrowserRouter>
  </StrictMode>,
)
