'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bookmark, CircleAlert, Share2, ShieldCheck, ShoppingBag, Sparkles, TrendingDown, ArrowRight } from 'lucide-react'
import Link from 'next/link'

import type { AnalysisResult, ComparisonOffer, ComparisonSummary } from '../lib/buywise-types'

type Props = {
  initialInput?: string
  mode?: 'home' | 'compare'
  autoAnalyze?: boolean
}

function saveItem(input: string, analysis: AnalysisResult) {
  const current = JSON.parse(localStorage.getItem('buywise_saved') || '[]')
  localStorage.setItem('buywise_saved', JSON.stringify([{ input, analysis, savedAt: new Date().toISOString() }, ...current]))
}

function formatPrice(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Not found'
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

function ComparisonCard({ comparison }: { comparison: ComparisonSummary }) {
  const sortedOffers = [...comparison.offers].sort((a, b) => {
    if (a.isCheapest) return -1
    if (b.isCheapest) return 1
    if (typeof a.price !== 'number') return 1
    if (typeof b.price !== 'number') return -1
    return a.price - b.price
  })
  const cheapest = comparison.cheapestOffer || sortedOffers.find(offer => offer.isCheapest) || null

  return (
    <section className="card comparison-shell" style={{ marginTop: 16 }}>
      <div className="comparison-header">
        <div>
          <div className="pill"><TrendingDown size={14} /> Kuwait price comparison</div>
          <h2 style={{ marginBottom: 8 }}>{comparison.sourceProductName || 'Tracked product'}</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {comparison.query}
          </p>
        </div>
        <div className="comparison-highlight">
          <div className="muted">Cheapest known option</div>
          <div className="comparison-price">{formatPrice(cheapest?.price)}</div>
          <div className="muted">
            {cheapest ? cheapest.retailer : 'No public match yet'}
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
        <span className={`pill ${comparison.trackingStatus === 'live' ? 'pill-live' : comparison.trackingStatus === 'estimated' ? 'pill-estimated' : 'pill-pending'}`}>
          {comparison.trackingStatus === 'live'
            ? 'Live price found'
            : comparison.trackingStatus === 'estimated'
              ? 'Best-effort comparison'
              : 'Still tracking'}
        </span>
        {typeof comparison.sourcePrice === 'number' ? <span className="pill">Source price: {formatPrice(comparison.sourcePrice)}</span> : null}
      </div>

      <div className="comparison-list">
        {sortedOffers.map(offer => (
          <article key={`${offer.retailer}-${offer.searchUrl}`} className={`comparison-row ${offer.isCheapest ? 'best' : ''}`}>
            <div className="comparison-row-main">
              <div className="row-head">
                <strong>{offer.retailer}</strong>
                <span className={comparisonBadgeClass(offer.confidence)}>{confidenceLabel(offer.confidence)}</span>
                {offer.isCheapest ? <span className="badge best">Cheapest</span> : null}
              </div>
              <div className="muted">{offer.note}</div>
              <div className="muted tiny">
                {offer.source}
                {offer.availability !== 'unknown' ? ` | ${offer.availability}` : ''}
              </div>
            </div>
            <div className="comparison-row-price">
              <div className="comparison-price">{formatPrice(offer.price)}</div>
              {formatSavings(offer.savingsFromSource) ? <div className="muted tiny">Save {formatSavings(offer.savingsFromSource)} vs source</div> : null}
            </div>
            <a className="btn secondary comparison-link" href={offer.url || offer.searchUrl} target="_blank" rel="noreferrer">
              Open <ArrowRight size={14} />
            </a>
          </article>
        ))}
      </div>
    </section>
  )
}

export function BuyWiseApp({ initialInput = '', mode = 'home', autoAnalyze = false }: Props) {
  const [input, setInput] = useState(initialInput)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState(
    mode === 'compare'
      ? 'Paste a product URL and we will try to compare Kuwait retailers.'
      : 'Demo mode stays available when no API key is configured.'
  )
  const autoRan = useRef(false)

  const analyze = useCallback(async (nextInput = input) => {
    if (!nextInput.trim()) return

    setError('')
    setLoading(true)
    setAnalysis(null)
    setStatusMessage('Reviewing the product and checking Kuwait price signals...')

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: nextInput })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')

      setAnalysis(data)
      setStatusMessage(
        data.demoMode
          ? 'Demo mode result shown because no live AI key is configured.'
          : `Analysis completed with ${data.providerLabel || 'AI'}. Comparison results are included below.`
      )
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Analysis failed'
      setError(message)
      setStatusMessage('The product could not be analyzed right now.')
    } finally {
      setLoading(false)
    }
  }, [input])

  useEffect(() => {
    const pending = localStorage.getItem('buywise_pending_input')
    if (pending) {
      setInput(pending)
      localStorage.removeItem('buywise_pending_input')
      if (autoAnalyze && !autoRan.current) {
        autoRan.current = true
        void analyze(pending)
      }
    }
  }, [autoAnalyze, analyze])

  useEffect(() => {
    if (initialInput) setInput(initialInput)
  }, [initialInput])

  useEffect(() => {
    if (autoAnalyze && initialInput && !autoRan.current) {
      autoRan.current = true
      void analyze(initialInput)
    }
  }, [autoAnalyze, analyze, initialInput])

  return (
    <main className="container">
      <header className="header">
        <div className="row">
          <div className="logo">B</div>
          <div>
            <b>BuyWise Kuwait</b>
            <div className="muted">Share or paste a product link to get a Buy / Wait / Avoid verdict.</div>
          </div>
        </div>
        <nav className="nav">
          <Link href={mode === 'compare' ? '/' : '/compare'}>{mode === 'compare' ? 'Home' : 'Compare'}</Link>
          <Link href="/saved">Saved</Link>
        </nav>
      </header>

      <section className="hero card" style={{ marginBottom: 16 }}>
        <div className="pill"><Sparkles size={14} /> Kuwait-first shopping decision assistant</div>
        <h1>{mode === 'compare' ? 'Compare Kuwait prices before you buy.' : 'Check before you buy.'}</h1>
        <p className="lead">
          {mode === 'compare'
            ? 'Paste a product URL and BuyWise will try to pull the current price, compare Kuwait retailers, and highlight the cheapest known option.'
            : 'Share or paste a product link from Instagram, TikTok, Amazon, Xcite, Blink, Best Al Yousifi, Eureka, Lulu, Carrefour, Namshi, Shein, iHerb, Boutiqaat, and more to get a simple buying verdict.'}
        </p>
        <div className="notice">
          <ShieldCheck size={18} />
          <span>{statusMessage}</span>
        </div>
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Paste product link or description here..." />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => void analyze()} disabled={loading || !input.trim()}>
            {loading ? 'Checking...' : 'Analyze'}
          </button>
          <Link className="btn secondary" href="/saved">
            <Bookmark size={16} /> Saved items
          </Link>
          {mode === 'home' ? (
            <Link className="btn secondary" href="/compare">
              Compare mode
            </Link>
          ) : null}
        </div>
        {error ? <p className="danger">{error}</p> : null}
      </section>

      <section className="grid">
        <div className="card feature">
          <Share2 />
          <h3>Share from anywhere</h3>
          <p className="muted">Use paste or Android share-target flow for marketplaces, social posts, and shop links.</p>
        </div>
        <div className="card feature">
          <ShoppingBag />
          <h3>Kuwait-first logic</h3>
          <p className="muted">Verdicts consider local warranty, delivery quality, returns, seller credibility, and overpricing risk.</p>
        </div>
        <div className="card feature">
          <CircleAlert />
          <h3>Clear red flags</h3>
          <p className="muted">Each result highlights hype risk, missing specs, suspicious pricing, and smarter alternatives.</p>
        </div>
      </section>

      {analysis ? (
        <section className="card" style={{ marginTop: 16 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="muted">Verdict</div>
              <div className={`verdict ${analysis.verdict === 'BUY' ? 'ok' : analysis.verdict === 'WAIT' ? 'warn' : 'danger'}`}>{analysis.verdict}</div>
            </div>
            <div>
              <div className="muted">Score</div>
              <div className="score">{analysis.score}</div>
            </div>
          </div>
          <h2>{analysis.productName}</h2>
          <p>{analysis.summary}</p>

          {analysis.comparison ? <ComparisonCard comparison={analysis.comparison} /> : null}

          <div className="grid" style={{ marginTop: 16 }}>
            <div>
              <h3>Pros</h3>
              <ul className="list">
                {analysis.pros.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Cons</h3>
              <ul className="list">
                {analysis.cons.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Red flags</h3>
              <ul className="list">
                {analysis.redFlags.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Kuwait notes</h3>
              <ul className="list">
                {analysis.kuwaitNotes.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <h3>Better alternatives</h3>
          <ul className="list">
            {analysis.betterAlternatives.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <button className="btn" onClick={() => saveItem(input, analysis)}>
            Save this item
          </button>
        </section>
      ) : null}
    </main>
  )
}
