import { useGoldPrices } from '../../context/GoldPricesContext.tsx'
import { CompareTab } from '../../components/CompareTab.tsx'

export function ComparePage() {
  const { hknRows, kkvhRows, history } = useGoldPrices()

  return <CompareTab hknRows={hknRows} kkvhRows={kkvhRows} history={history} />
}
