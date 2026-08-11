import type { ComponentType } from 'react'
import { SummaryPage } from './pages/SummaryPage/index.tsx'
import { HknPage } from './pages/HknPage/index.tsx'
import { KkvhPage } from './pages/KkvhPage/index.tsx'
import { HnPage } from './pages/HnPage/index.tsx'
import { CrawlPage } from './pages/CrawlPage/index.tsx'

export type AppRouteId = 'summary' | 'hkn' | 'kkvh' | 'hn' | 'crawl'

export type AppRoute = {
  id: AppRouteId
  path: string
  label: string
  Component: ComponentType
}

/** Canonical route table — keep nav + router in sync here. */
export const routes: AppRoute[] = [
  {
    id: 'summary',
    path: '/',
    label: 'Tổng hợp',
    Component: SummaryPage,
  },
  {
    id: 'hkn',
    path: '/hkn',
    label: 'Hoa Kim Nguyên',
    Component: HknPage,
  },
  {
    id: 'kkvh',
    path: '/kkvh',
    label: 'Kim Khánh Việt Hùng',
    Component: KkvhPage,
  },
  {
    id: 'hn',
    path: '/hn',
    label: 'Hồng Ngọc',
    Component: HnPage,
  },
  {
    id: 'crawl',
    path: '/crawl',
    label: 'Lịch crawl',
    Component: CrawlPage,
  },
]

export const defaultRoute = routes[0]

export function getRouteByPath(pathname: string): AppRoute | undefined {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  return (
    routes.find((r) => r.path === normalized) ??
    routes.find((r) => r.path !== '/' && normalized.endsWith(r.path))
  )
}
