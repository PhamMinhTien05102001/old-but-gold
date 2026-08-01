import { useGoldPrices } from '../../context/GoldPricesContext.tsx'
import { StoreTab } from '../../components/StoreTab.tsx'

export function KkvhPage() {
  const { kkvh, kkvhRows, history } = useGoldPrices()

  return (
    <StoreTab
      store="kkvh"
      storeName="Kim Khánh Việt Hùng"
      rows={kkvhRows}
      sourceUpdatedAt={kkvh?.sourceUpdatedAt}
      history={history}
    />
  )
}
