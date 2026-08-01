import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { GoldPricesProvider } from './context/GoldPricesContext.tsx'
import { routes } from './routes.ts'

const baseUrl = import.meta.env.BASE_URL
const basename = baseUrl.replace(/\/$/, '') || undefined

// Production hosts may serve index at `/old-but-got` without slash; normalize so relative URLs work.
if (basename && window.location.pathname === basename) {
  window.location.replace(`${baseUrl}${window.location.search}${window.location.hash}`)
} else {
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
}
