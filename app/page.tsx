'use client'

import { useEffect, useState } from 'react'
import { Bookmark, CircleAlert, Share2, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type Analysis = {
  verdict: 'BUY' | 'WAIT' | 'AVOID'
  score: number
  productName: string
  summary: string
  pros: string[]
  cons: string[]
  redFlags: string[]
  kuwaitNotes: string[]
  betterAlternatives: string[]
  demoMode?: boolean
  providerLabel?: string
}

function saveItem(input: string, analysis: Analysis) {
  const current = JSON.parse(localStorage.getItem('buywise_saved') || '[]')
  localStorage.setItem('buywise_saved', JSON.stringify([{ input, analysis, savedAt: new Date().toISOString() }, ...current]))
}

export default function Home() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('Demo mode stays available when no API key is configured.')

  useEffect(() => {
    const pending = localStorage.getItem('buywise_pending_input')
    if (pending) {
      setInput(pending)
      localStorage.removeItem('buywise_pending_input')
    }
  }, [])

  async function analyze() {
    setError('')
    setLoading(true)
    setAnalysis(null)
    setStatusMessage('Reviewing the product and preparing a verdict...')

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')

      setAnalysis(data)
      setStatusMessage(data.demoMode ? 'Demo mode result shown because no live AI key is configured.' : `Analysis completed with ${data.providerLabel || 'AI'}.`)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Analysis failed'
      setError(message)
      setStatusMessage('The product could not be analyzed right now.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="container">
    <header className="header">
      <div className="row">
        <div className="logo">B</div>
        <div>
          <b>BuyWise Kuwait</b>
          <div className="muted">Share or paste a product link to get a Buy / Wait / Avoid verdict.</div>
        </div>
      </div>
      <nav className="nav"><Link href="/saved">Saved</Link></nav>
    </header>

    <section className="hero card" style={{ marginBottom: 16 }}>
      <div className="pill"><Sparkles size={14} /> Kuwait-first shopping decision assistant</div>
      <h1>Check before you buy.</h1>
      <p className="lead">Share or paste a product link from Instagram, TikTok, Amazon, Xcite, Blink, Best Al Yousifi, Eureka, Lulu, Carrefour, Namshi, Shein, iHerb, Boutiqaat, and more to get a simple buying verdict.</p>
      <div className="notice">
        <ShieldCheck size={18} />
        <span>{statusMessage}</span>
      </div>
      <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Paste product link or description here..." />
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn" onClick={analyze} disabled={loading || !input.trim()}>{loading ? 'Checking...' : 'Analyze'}</button>
        <Link className="btn secondary" href="/saved"><Bookmark size={16} /> Saved items</Link>
      </div>
      {error && <p className="danger">{error}</p>}
    </section>

    <section className="grid">
      <div className="card feature"><Share2 /><h3>Share from anywhere</h3><p className="muted">Use paste or Android share-target flow for marketplaces, social posts, and shop links.</p></div>
      <div className="card feature"><ShoppingBag /><h3>Kuwait-first logic</h3><p className="muted">Verdicts consider local warranty, delivery quality, returns, seller credibility, and overpricing risk.</p></div>
      <div className="card feature"><CircleAlert /><h3>Clear red flags</h3><p className="muted">Each result highlights hype risk, missing specs, suspicious pricing, and smarter alternatives.</p></div>
    </section>

    {analysis && <section className="card" style={{ marginTop: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div><div className="muted">Verdict</div><div className={`verdict ${analysis.verdict === 'BUY' ? 'ok' : analysis.verdict === 'WAIT' ? 'warn' : 'danger'}`}>{analysis.verdict}</div></div>
        <div><div className="muted">Score</div><div className="score">{analysis.score}</div></div>
      </div>
      <h2>{analysis.productName}</h2>
      <p>{analysis.summary}</p>
      <div className="grid">
        <div><h3>Pros</h3><ul className="list">{analysis.pros.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
        <div><h3>Cons</h3><ul className="list">{analysis.cons.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
        <div><h3>Red flags</h3><ul className="list">{analysis.redFlags.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
        <div><h3>Kuwait notes</h3><ul className="list">{analysis.kuwaitNotes.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
      </div>
      <h3>Better alternatives</h3>
      <ul className="list">{analysis.betterAlternatives.map((item, index) => <li key={index}>{item}</li>)}</ul>
      <button className="btn" onClick={() => saveItem(input, analysis)}>Save this item</button>
    </section>}
  </main>
}
