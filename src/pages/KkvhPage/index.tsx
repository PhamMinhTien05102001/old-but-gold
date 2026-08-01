import { useGoldPrices } from '../../context/GoldPricesContext.tsx'
import { StoreTab } from '../../components/StoreTab.tsx'
import { STORE_META } from '../../lib/stores.ts'

export function KkvhPage() {
  const { kkvh, kkvhRows, history, getStoreStatus } = useGoldPrices()

  return (
    <StoreTab
      store="kkvh"
      storeName="Kim Khánh Việt Hùng"
      rows={kkvhRows}
      sourceUpdatedAt={kkvh?.sourceUpdatedAt}
      history={history}
      health={getStoreStatus('kkvh')}
      sourceUrl={STORE_META.kkvh.url}
    />
  )
}
