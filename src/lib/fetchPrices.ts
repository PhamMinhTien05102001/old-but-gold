import { parseHkn } from './parseHkn'
import { parseKkvh } from './parseKkvh'
import type { StoreSnapshot } from '../types'

async function fetchHtml(path: string): Promise<string> {
  const res = await fetch(path, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Không tải được dữ liệu (${res.status}) từ ${path}`)
  }
  return res.text()
}

export async function fetchHknSnapshot(): Promise<StoreSnapshot> {
  const html = await fetchHtml('/proxy/hkn')
  const snap = parseHkn(html)
  if (!snap.rows.length) {
    throw new Error('Không tìm thấy dòng vàng 9999 trên Hoa Kim Nguyên')
  }
  return snap
}

export async function fetchKkvhSnapshot(): Promise<StoreSnapshot> {
  const html = await fetchHtml('/proxy/kkvh')
  const snap = parseKkvh(html)
  if (!snap.rows.length) {
    throw new Error('Không tìm thấy dòng Vàng 999.9 trên Kim Khánh Việt Hùng')
  }
  return snap
}

export async function fetchAllSnapshots(): Promise<{
  hkn: StoreSnapshot
  kkvh: StoreSnapshot
}> {
  const [hkn, kkvh] = await Promise.all([fetchHknSnapshot(), fetchKkvhSnapshot()])
  return { hkn, kkvh }
}
