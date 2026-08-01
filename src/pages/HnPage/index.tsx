import { useGoldPrices } from '../../context/GoldPricesContext.tsx'
import { StoreTab } from '../../components/StoreTab.tsx'

export function HnPage() {
  const { hn, hnRows, history } = useGoldPrices()

  return (
    <StoreTab
      store="hn"
      storeName="Hồng Ngọc"
      rows={hnRows}
      sourceUpdatedAt={hn?.sourceUpdatedAt}
      history={history}
    />
  )
}
