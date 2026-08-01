import { useGoldPrices } from '../../context/GoldPricesContext.tsx'
import { StoreTab } from '../../components/StoreTab.tsx'

export function HknPage() {
  const { hkn, hknRows, history } = useGoldPrices()

  return (
    <StoreTab
      store="hkn"
      storeName="Hoa Kim Nguyên"
      rows={hknRows}
      sourceUpdatedAt={hkn?.sourceUpdatedAt}
      history={history}
    />
  )
}
