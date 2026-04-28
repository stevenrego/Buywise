export type Verdict = 'BUY' | 'WAIT' | 'AVOID'
export type MarketScope = 'kuwait' | 'middle-east' | 'worldwide'

export type ComparisonConfidence = 'live' | 'estimated' | 'search' | 'missing'

export type ComparisonOffer = {
  retailer: string
  price: number | null
  currency: 'KD'
  url?: string
  searchUrl: string
  source: string
  confidence: ComparisonConfidence
  note: string
  availability: 'in stock' | 'out of stock' | 'unknown'
  savingsFromSource?: number | null
  isCheapest?: boolean
}

export type ComparisonSummary = {
  marketScope: MarketScope
  marketLabel: string
  query: string
  sourceProductName?: string
  sourcePrice?: number | null
  sourceUrl?: string
  trackingStatus: 'live' | 'estimated' | 'missing'
  offers: ComparisonOffer[]
  cheapestOffer?: ComparisonOffer | null
  savings?: number | null
  fallbackMessage?: string
}

export type AnalysisResult = {
  verdict: Verdict
  score: number
  productName: string
  summary: string
  pros: string[]
  cons: string[]
  redFlags: string[]
  kuwaitNotes: string[]
  betterAlternatives: string[]
  comparison?: ComparisonSummary
  demoMode?: boolean
  providerLabel?: string
  error?: string
}
