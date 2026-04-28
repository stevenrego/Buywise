'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Bookmark, CircleAlert, Globe, Search, Share2, ShieldCheck, ShoppingBag, Sparkles, TrendingDown } from 'lucide-react'

import type { AnalysisResult, ClarificationSummary, ComparisonOffer, ComparisonSummary, MarketScope, SearchPlanSummary } from '../lib/buywise-types'

type Props = {
  initialInput?: string
  initialScope?: MarketScope
  mode?: 'home' | 'compare'
  autoAnalyze?: boolean
}

type MarketOption = {
  value: MarketScope
  label: string
  helper: string
}

const MARKET_OPTIONS: MarketOption[] = [
  { value: 'kuwait', label: 'Kuwait', helper: 'Default market' },
  { value: 'middle-east', label: 'Middle East', helper: 'GCC and nearby stores' },
  { value: 'worldwide', label: 'Worldwide', helper: 'Global stores and marketplaces' }
]

function saveItem(input: string, analysis: AnalysisResult) {
  const current = JSON.parse(localStorage.getItem('buywise_saved') || '[]')
  localStorage.setItem('buywise_saved', JSON.stringify([{ input, analysis, savedAt: new Date().toISOString() }, ...current]))
}

function formatPrice(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return `${value.toFixed(3)} KD`
}

function formatSavings(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return null
  return `${value.toFixed(3)} KD`
}

function confidenceLabel(value: ComparisonOffer['confidence']) {
  if (value === 'live') return 'Live'
  if (value === 'estimated') return 'Estimated'
  if (value === 'search') return 'Search hit'
  return 'Pending'
}

function comparisonBadgeClass(value: ComparisonOffer['confidence']) {
  if (value === 'live') return 'badge live'
  if (value === 'estimated') return 'badge estimated'
  if (value === 'search') return 'badge search'
  return 'badge pending'
}

function SearchPlanCard({ searchPlan, marketLabel }: { searchPlan?: SearchPlanSummary; marketLabel: string }) {
  if (!searchPlan) return null

  return (
    <section className="card comparison-shell" style={{ marginTop: 16 }}>
      <div className="pill">
        <Sparkles size={14} />
        What we understood
      </div>
      <div className="comparison-header" style={{ marginTop: 12 }}>
        <div>
          <h2 style={{ marginBottom: 8 }}>{searchPlan.canonicalName}</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {searchPlan.productCategory} | default market: {marketLabel}
          </p>
          {searchPlan.notes[0] ? <p className="muted">{searchPlan.notes[0]}</p> : null}
        </div>
        <div className="comparison-highlight">
          <div className="muted">AI search plan</div>
          <div className="comparison-price">{searchPlan.searchQueries.length}</div>
          <div className="muted">queries generated</div>
        </div>
      </div>

      <div className="chip-grid" style={{ marginTop: 12 }}>
        {searchPlan.searchQueries.map(query => (
          <span key={query} className="pill">
            {query}
          </span>
        ))}
      </div>

      {searchPlan.excludedTerms.length ? (
        <div className="notice comparison-notice" style={{ marginTop: 12 }}>
          <ShieldCheck size={18} />
          <span>Avoiding: {searchPlan.excludedTerms.slice(0, 3).join(', ')}</span>
        </div>
      ) : null}
    </section>
  )
}

function ClarificationCard({
  clarification,
  onPick
}: {
  clarification: ClarificationSummary
  onPick: (value: string) => void
}) {
  return (
    <section className="card clarification-shell" style={{ marginTop: 16 }}>
      <div className="pill">
        <ShieldCheck size={14} />
        One quick detail
      </div>
      <h2 style={{ marginTop: 12, marginBottom: 8 }}>{clarification.question}</h2>
      {clarification.reason ? <p className="muted">{clarification.reason}</p> : null}
      <p className="muted" style={{ marginTop: 0 }}>
        Pick the closest match and I’ll compare prices right away.
      </p>
      <div className="clarification-options">
        {clarification.options.map(option => (
          <button key={option} type="button" className="clarification-option" onClick={() => onPick(option)}>
            {option}
          </button>
        ))}
      </div>
    </section>
  )
}

function ComparisonCard({ comparison }: { comparison: ComparisonSummary }) {
  const sortedOffers = [...comparison.offers].sort((a, b) => {
    if (a.isCheapest) return -1
    if (b.isCheapest) return 1
    if (typeof a.price !== 'number') return 1
    if (typeof b.price !== 'number') return -1
    return a.price - b.price
  })

  const cheapest = comparison.cheapestOffer || sortedOffers.find(offer => offer.isCheapest) || null
  const pricedOffers = sortedOffers.filter(offer => typeof offer.price === 'number')
  const visibleOffers = pricedOffers.length ? pricedOffers.slice(0, 3) : sortedOffers.slice(0, 3)
  const remainingOffers = sortedOffers.slice(visibleOffers.length)

  return (
    <section className="card comparison-shell" style={{ marginTop: 16 }}>
      <div className="comparison-header">
        <div>
          <div className="pill">
            <TrendingDown size={14} />
            Compare in {comparison.marketLabel}
          </div>
          <h2 style={{ marginBottom: 8 }}>{comparison.sourceProductName || 'Tracked product'}</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {comparison.query}
          </p>
        </div>
        <div className="comparison-highlight">
          <div className="muted">Cheapest known option</div>
          {formatPrice(cheapest?.price) ? (
            <div className="comparison-price">{formatPrice(cheapest?.price)}</div>
          ) : (
            <div className="comparison-empty-price">No verified public match yet</div>
          )}
          <div className="muted">
            {cheapest?.retailer || 'We are still searching'}
            {comparison.savings !== null && comparison.savings !== undefined && comparison.savings > 0 ? (
              <span className="savings-chip">Save {comparison.savings.toFixed(3)} KD</span>
            ) : null}
          </div>
        </div>
      </div>

      {comparison.fallbackMessage ? (
        <div className="notice comparison-notice" style={{ marginTop: 8 }}>
          <ShieldCheck size={18} />
          <span>{comparison.fallbackMessage}</span>
        </div>
      ) : null}

      <div className="comparison-meta">
        <span
          className={`pill ${
            comparison.trackingStatus === 'live'
              ? 'pill-live'
              : comparison.trackingStatus === 'estimated'
                ? 'pill-estimated'
                : 'pill-pending'
          }`}
        >
          {comparison.trackingStatus === 'live'
            ? 'Live price found'
            : comparison.trackingStatus === 'estimated'
              ? 'Best-effort comparison'
              : 'Still comparing'}
        </span>
        {typeof comparison.sourcePrice === 'number' ? <span className="pill">Source price: {formatPrice(comparison.sourcePrice)}</span> : null}
      </div>

      <div className="comparison-list">
        {visibleOffers.map(offer => (
          <article key={`${offer.retailer}-${offer.searchUrl}`} className={`offer-card ${offer.isCheapest ? 'best' : ''}`}>
            <div className="offer-copy">
              <div className="row-head">
                <strong>{offer.retailer}</strong>
                <span className={comparisonBadgeClass(offer.confidence)}>{confidenceLabel(offer.confidence)}</span>
                {offer.isCheapest ? <span className="badge best">Best price</span> : null}
              </div>
              <div className="muted">{offer.note}</div>
              <div className="muted tiny">
                {offer.source}
                {offer.availability !== 'unknown' ? ` | ${offer.availability}` : ''}
              </div>
            </div>
            <div className="offer-action">
              {formatPrice(offer.price) ? (
                <div className="comparison-price">{formatPrice(offer.price)}</div>
              ) : (
                <div className="comparison-empty-price compact">No public price yet</div>
              )}
              {formatSavings(offer.savingsFromSource) ? <div className="muted tiny">Save {formatSavings(offer.savingsFromSource)} vs source</div> : null}
              <a className="btn secondary comparison-link" href={offer.url || offer.searchUrl} target="_blank" rel="noreferrer">
                {formatPrice(offer.price) ? 'Visit' : 'Search'} <ArrowRight size={14} />
              </a>
            </div>
          </article>
        ))}
      </div>

      {remainingOffers.length ? (
        <details className="comparison-details" style={{ marginTop: 12 }}>
          <summary className="muted" style={{ cursor: 'pointer' }}>
            Show {remainingOffers.length} more stores checked
          </summary>
          <div className="comparison-mini-list">
            {remainingOffers.map(offer => (
              <article key={`${offer.retailer}-${offer.searchUrl}-mini`} className="comparison-mini-item">
                <div>
                  <strong>{offer.retailer}</strong>
                  <div className="muted tiny">{offer.note}</div>
                </div>
                <div className="muted tiny">{formatPrice(offer.price) || 'Not verified yet'}</div>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  )
}

export function BuyWiseApp({ initialInput = '', initialScope = 'kuwait', mode = 'home', autoAnalyze = false }: Props) {
  const [input, setInput] = useState(initialInput)
  const [scope, setScope] = useState<MarketScope>(initialScope)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('Search or share a product, compare Kuwait prices by default, and widen scope when needed.')
  const autoRan = useRef(false)

  const analyze = useCallback(
    async (nextInput = input, nextScope = scope) => {
      if (!nextInput.trim()) return

      setError('')
      setLoading(true)
      setAnalysis(null)
      setStatusMessage(`Checking ${MARKET_OPTIONS.find(option => option.value === nextScope)?.label || 'Kuwait'} prices...`)

      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: nextInput, marketScope: nextScope })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Analysis failed')

        setAnalysis(data)
        setStatusMessage(
          data.clarification
            ? data.clarification.question
            : data.demoMode
              ? 'Demo mode result shown because no live AI key is configured.'
              : `Comparison completed for ${data.comparison?.marketLabel || 'Kuwait'} with ${data.providerLabel || 'AI'}.`
        )
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Analysis failed'
        setError(message)
        setStatusMessage('The product could not be compared right now.')
      } finally {
        setLoading(false)
      }
    },
    [input, scope]
  )

  useEffect(() => {
    const pending = localStorage.getItem('buywise_pending_input')
    if (pending) {
      setInput(pending)
      localStorage.removeItem('buywise_pending_input')
      if (autoAnalyze && !autoRan.current) {
        autoRan.current = true
        void analyze(pending, scope)
      }
    }
  }, [autoAnalyze, analyze, scope])

  useEffect(() => {
    if (initialInput) setInput(initialInput)
  }, [initialInput])

  useEffect(() => {
    if (autoAnalyze && initialInput && !autoRan.current) {
      autoRan.current = true
      void analyze(initialInput, scope)
    }
  }, [autoAnalyze, analyze, initialInput, scope])

  const scopeLabel = MARKET_OPTIONS.find(option => option.value === scope)?.label || 'Kuwait'

  return (
    <main className="container">
      <header className="header">
        <div className="row">
          <div className="logo">B</div>
          <div>
            <b>BuyWise Kuwait</b>
            <div className="muted">Search, paste, or share a product to compare prices by market.</div>
          </div>
        </div>
        <nav className="nav">
          <Link href={mode === 'compare' ? '/' : '/compare'}>{mode === 'compare' ? 'Search mode' : 'Compare'}</Link>
          <Link href="/saved">Saved</Link>
        </nav>
      </header>

      <section className="hero card" style={{ marginBottom: 16 }}>
        <div className="pill">
          <Sparkles size={14} /> Price comparison first
        </div>
        <h1>{`Compare prices in ${scopeLabel} first.`}</h1>
        <p className="lead">
          Paste a product name, product link, or shared Instagram or Facebook post. BuyWise will compare trusted stores in Kuwait by default,
          then expand to Middle East or worldwide when you change the market scope.
        </p>
        <div className="notice">
          <ShieldCheck size={18} />
          <span>{statusMessage}</span>
        </div>

        <div className="scope-strip" role="tablist" aria-label="Market scope">
          {MARKET_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              className={`scope-chip ${scope === option.value ? 'active' : ''}`}
              onClick={() => setScope(option.value)}
            >
              <Globe size={14} />
              <span>{option.label}</span>
              <small>{option.helper}</small>
            </button>
          ))}
        </div>

        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Paste a product link, product name, or shared post here..."
        />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => void analyze()} disabled={loading || !input.trim()}>
            {loading ? 'Comparing...' : 'Compare prices'}
          </button>
          <Link className="btn secondary" href="/saved">
            <Bookmark size={16} /> Saved items
          </Link>
          <Link className="btn secondary" href="/share">
            <Share2 size={16} /> Share input
          </Link>
        </div>
        {error ? <p className="danger">{error}</p> : null}
      </section>

      <section className="grid">
        <div className="card feature">
          <Search />
          <h3>Search by product</h3>
          <p className="muted">Type a model name or paste a store link and compare prices across the selected market.</p>
        </div>
        <div className="card feature">
          <Share2 />
          <h3>Share from apps</h3>
          <p className="muted">Use the share-target flow from Instagram, Facebook, TikTok, or any browser tab that supports sharing.</p>
        </div>
        <div className="card feature">
          <ShoppingBag />
          <h3>Default Kuwait view</h3>
          <p className="muted">Kuwait stores are the default, so users see local price differences first before widening the search.</p>
        </div>
      </section>

      {analysis ? (
        <>
          {analysis.clarification ? (
            <ClarificationCard
              clarification={analysis.clarification}
              onPick={value => {
                setInput(value)
                void analyze(value, scope)
              }}
            />
          ) : null}

          {!analysis.clarification ? (
            <>
              <SearchPlanCard searchPlan={analysis.searchPlan} marketLabel={analysis.comparison?.marketLabel || scopeLabel} />
              {analysis.comparison ? <ComparisonCard comparison={analysis.comparison} /> : null}
              <section className="card result-footer" style={{ marginTop: 16 }}>
            <div className="result-footer-top">
              <div>
                <div className="muted">Comparison status</div>
                <div
                  className={`score ${
                    analysis.comparison?.trackingStatus === 'live'
                      ? 'ok'
                      : analysis.comparison?.trackingStatus === 'estimated'
                        ? 'warn'
                        : ''
                  }`}
                >
                  {analysis.comparison?.trackingStatus === 'live'
                    ? 'Live match'
                    : analysis.comparison?.trackingStatus === 'estimated'
                      ? 'Best effort'
                      : 'Still comparing'}
                </div>
              </div>
              <div>
                <div className="muted">Best known savings</div>
                <div className="score">{analysis.comparison?.savings ? `${analysis.comparison.savings.toFixed(3)} KD` : 'N/A'}</div>
              </div>
            </div>

            <div className="result-footer-grid">
              <div>
                <h3>Scope</h3>
                <p className="muted">{analysis.comparison?.marketLabel || 'Kuwait'} by default, with wider scope available.</p>
              </div>
              <div>
                <h3>Confidence</h3>
                <p className="muted">
                  {analysis.comparison?.trackingStatus === 'live'
                    ? 'We found live pricing on a public page.'
                    : analysis.comparison?.trackingStatus === 'estimated'
                      ? 'We found a likely match, but the page did not expose a clean live price.'
                      : 'We could not verify a public match yet.'}
                </p>
              </div>
              <div>
                <h3>What to do next</h3>
                <p className="muted">Open the cheapest store, compare return policy and warranty, then decide.</p>
              </div>
            </div>

            <details style={{ marginTop: 16 }}>
              <summary className="muted" style={{ cursor: 'pointer' }}>
                Show search logic
              </summary>
              <div className="grid" style={{ marginTop: 16 }}>
                <div>
                  <h3>AI notes</h3>
                  <p className="muted">{analysis.searchPlan?.notes?.[0] || 'The AI search plan is used to broaden product matching.'}</p>
                </div>
                <div>
                  <h3>How we searched</h3>
                  <p className="muted">{analysis.searchPlan?.searchQueries?.slice(0, 3).join(' | ') || 'Broader market queries across Kuwait stores.'}</p>
                </div>
              </div>
            </details>

            <div className="notice" style={{ marginTop: 12 }}>
              <CircleAlert size={18} />
              <span>BuyWise is centered on product understanding and comparison. The decision score is kept behind the scenes.</span>
            </div>

            <button className="btn" onClick={() => saveItem(input, analysis)}>
              Save this item
            </button>
          </section>
            </>
          ) : null}
        </>
      ) : null}
    </main>
  )
}
