import { useGoldPrices } from '../../context/GoldPricesContext.tsx'
import { StoreTab } from '../../components/StoreTab.tsx'
import { STORE_META } from '../../lib/stores.ts'

export function HknPage() {
  const { hkn, hknRows, history, getStoreStatus } = useGoldPrices()

  return (
    <StoreTab
      store="hkn"
      storeName="Hoa Kim Nguyên"
      rows={hknRows}
      sourceUpdatedAt={hkn?.sourceUpdatedAt}
      history={history}
      health={getStoreStatus('hkn')}
      sourceUrl={STORE_META.hkn.url}
    />
  )
}
