import { useMemo } from 'react'
import { useGoldPrices } from '../../context/GoldPricesContext.tsx'
import { SummaryTable, type SummaryRow } from '../../components/SummaryTable.tsx'

export function SummaryPage() {
  const { hkn, kkvh, hn, hknRows, kkvhRows, hnRows, history, getStoreStatus } =
    useGoldPrices()

  const rows = useMemo(() => {
    const out: SummaryRow[] = []
    for (const row of hknRows) {
      out.push({
        storeId: 'hkn',
        storeName: 'Hoa Kim Nguyên',
        buy: row.buy,
        sell: row.sell,
        kind: row.kind,
        sourceUpdatedAt: hkn?.sourceUpdatedAt,
        health: getStoreStatus('hkn'),
      })
    }
    for (const row of kkvhRows) {
      out.push({
        storeId: 'kkvh',
        storeName: 'Kim Khánh Việt Hùng',
        buy: row.buy,
        sell: row.sell,
        kind: row.kind,
        sourceUpdatedAt: kkvh?.sourceUpdatedAt,
        health: getStoreStatus('kkvh'),
      })
    }
    for (const row of hnRows) {
      out.push({
        storeId: 'hn',
        storeName: 'Hồng Ngọc',
        buy: row.buy,
        sell: row.sell,
        kind: row.kind,
        sourceUpdatedAt: hn?.sourceUpdatedAt,
        health: getStoreStatus('hn'),
      })
    }
    return out
  }, [hkn, kkvh, hn, hknRows, kkvhRows, hnRows, getStoreStatus])

  return <SummaryTable rows={rows} history={history} />
}
