import { BuyWiseApp } from '../../components/BuyWiseApp'

export const dynamic = 'force-dynamic'

export default async function ComparePage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; url?: string }>
}) {
  const params = (await searchParams) || {}
  const rawInput = params.q || params.url || ''

  return <BuyWiseApp mode="compare" initialInput={rawInput} autoAnalyze={Boolean(rawInput)} />
}
