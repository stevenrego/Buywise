'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export const dynamic = 'force-dynamic'

type Item = {
  input: string
  savedAt: string
  analysis: {
    productName: string
    summary: string
    comparison?: {
      marketLabel: string
      cheapestOffer?: {
        retailer: string
        price: number | null
      } | null
    }
  }
}

export default function Saved() {
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    setItems(JSON.parse(localStorage.getItem('buywise_saved') || '[]'))
  }, [])

  return (
    <main className="container">
      <header className="header">
        <div>
          <b>Saved Items</b>
          <div className="muted">Products and links you decided to revisit.</div>
        </div>
        <Link href="/">Home</Link>
      </header>
      <div className="grid">
        {items.length === 0 && (
          <div className="card">
            <h2>No saved items yet</h2>
            <p className="muted">Compare something and save it for later.</p>
          </div>
        )}
        {items.map((item, index) => (
          <div className="card" key={index}>
            <h3>{item.analysis.productName}</h3>
            <p className="muted">{item.analysis.summary}</p>
            <p className="muted">
              {item.analysis.comparison?.marketLabel || 'Kuwait'} ·{' '}
              {item.analysis.comparison?.cheapestOffer?.retailer
                ? `${item.analysis.comparison.cheapestOffer.retailer} ${item.analysis.comparison.cheapestOffer.price !== null ? `at ${item.analysis.comparison.cheapestOffer.price.toFixed(3)} KD` : ''}`
                : 'No verified match yet'}
            </p>
            <small className="muted">{new Date(item.savedAt).toLocaleString()}</small>
          </div>
        ))}
      </div>
    </main>
  )
}
