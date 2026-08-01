import { useGoldPrices } from '../../context/GoldPricesContext.tsx'
import { StoreTab } from '../../components/StoreTab.tsx'
import { STORE_META } from '../../lib/stores.ts'

export function HnPage() {
  const { hn, hnRows, history, getStoreStatus } = useGoldPrices()

  return (
    <StoreTab
      store="hn"
      storeName="Hồng Ngọc"
      rows={hnRows}
      sourceUpdatedAt={hn?.sourceUpdatedAt}
      history={history}
      health={getStoreStatus('hn')}
      sourceUrl={STORE_META.hn.url}
    />
  )
}
