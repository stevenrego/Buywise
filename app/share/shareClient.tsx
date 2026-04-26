'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function ShareClient({ shared }: { shared: string }) {
  const [value, setValue] = useState(shared)

  useEffect(() => {
    if (shared) {
      localStorage.setItem('buywise_last_shared', shared)
    }
  }, [shared])

  return <main className="container">
    <div className="card">
      <h1>Shared to BuyWise</h1>
      <p className="muted">Review the shared content, then analyze it for a Buy / Wait / Avoid verdict.</p>
      <textarea value={value} onChange={e => setValue(e.target.value)} />
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn" onClick={() => { localStorage.setItem('buywise_pending_input', value); location.href = '/' }}>Analyze now</button>
        <Link className="btn secondary" href="/">Home</Link>
      </div>
    </div>
  </main>
}
