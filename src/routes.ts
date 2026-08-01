import type { ComponentType } from 'react'
import { HknPage } from './pages/HknPage/index.tsx'
import { KkvhPage } from './pages/KkvhPage/index.tsx'

export type AppRouteId = 'hkn' | 'kkvh'

export type AppRoute = {
  id: AppRouteId
  path: string
  label: string
  Component: ComponentType
}

/** Canonical route table — keep nav + router in sync here. */
export const routes: AppRoute[] = [
  {
    id: 'hkn',
    path: '/',
    label: 'Hoa Kim Nguyên',
    Component: HknPage,
  },
  {
    id: 'kkvh',
    path: '/kkvh',
    label: 'Kim Khánh Việt Hùng',
    Component: KkvhPage,
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
