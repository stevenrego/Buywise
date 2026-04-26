'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type Item = {
  input: string
  savedAt: string
  analysis: {
    verdict: string
    score: number
    productName: string
    summary: string
  }
}

export default function Saved() {
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    setItems(JSON.parse(localStorage.getItem('buywise_saved') || '[]'))
  }, [])

  return <main className="container">
    <header className="header">
      <div><b>Saved Items</b><div className="muted">Products and links you decided to revisit.</div></div>
      <Link href="/">Home</Link>
    </header>
    <div className="grid">
      {items.length === 0 && <div className="card"><h2>No saved items yet</h2><p className="muted">Analyze something and save it.</p></div>}
      {items.map((item, index) => <div className="card" key={index}>
        <div className="pill">{item.analysis.verdict} · {item.analysis.score}/100</div>
        <h3>{item.analysis.productName}</h3>
        <p className="muted">{item.analysis.summary}</p>
        <small className="muted">{new Date(item.savedAt).toLocaleString()}</small>
      </div>)}
    </div>
  </main>
}
