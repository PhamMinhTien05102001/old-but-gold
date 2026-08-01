import { useMemo } from 'react'
import { useGoldPrices } from '../../context/GoldPricesContext.tsx'
import { SummaryTable, type SummaryRow } from '../../components/SummaryTable.tsx'
import {
  normalizeSourceUpdatedAt,
  sourceUpdatedAtToMs,
} from '../../lib/normalize.ts'

export function SummaryPage() {
  const { hkn, kkvh, hknRows, kkvhRows, history } = useGoldPrices()

  const rows = useMemo(() => {
    const out: SummaryRow[] = []
    for (const row of hknRows) {
      out.push({
        storeId: 'hkn',
        storeName: 'Hoa Kim Nguyên',
        buy: row.buy,
        sell: row.sell,
        kind: row.kind,
      })
    }
    for (const row of kkvhRows) {
      out.push({
        storeId: 'kkvh',
        storeName: 'Kim Khánh Việt Hùng',
        buy: row.buy,
        sell: row.sell,
        kind: row.kind,
      })
    }
    return out
  }, [hknRows, kkvhRows])

  const sourceUpdatedAt = useMemo(() => {
    const candidates = [hkn?.sourceUpdatedAt, kkvh?.sourceUpdatedAt]
      .map((v) => normalizeSourceUpdatedAt(v))
      .filter((v): v is string => Boolean(v))
    if (!candidates.length) return undefined
    return candidates.reduce((best, cur) => {
      const bestMs = sourceUpdatedAtToMs(best) ?? 0
      const curMs = sourceUpdatedAtToMs(cur) ?? 0
      return curMs >= bestMs ? cur : best
    })
  }, [hkn?.sourceUpdatedAt, kkvh?.sourceUpdatedAt])

  return (
    <SummaryTable rows={rows} history={history} sourceUpdatedAt={sourceUpdatedAt} />
  )
}
