import { BuyWiseApp } from '../../components/BuyWiseApp'

export const dynamic = 'force-dynamic'

export default async function ComparePage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; url?: string; market?: string; scope?: string }>
}) {
  const params = (await searchParams) || {}
  const rawInput = params.q || params.url || ''
  const rawScope = params.market || params.scope || 'kuwait'
  const initialScope = rawScope === 'middle-east' || rawScope === 'worldwide' ? rawScope : 'kuwait'

  return <BuyWiseApp mode="compare" initialInput={rawInput} initialScope={initialScope} autoAnalyze={Boolean(rawInput)} />
}
