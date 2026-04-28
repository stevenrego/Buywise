'use client'

import { useSearchParams } from 'next/navigation'

import { BuyWiseApp } from '../../components/BuyWiseApp'

export const dynamic = 'force-dynamic'

export default function ComparePage() {
  const searchParams = useSearchParams()
  const rawInput = searchParams.get('q') || searchParams.get('url') || ''

  return <BuyWiseApp mode="compare" initialInput={rawInput} autoAnalyze={Boolean(rawInput)} />
}