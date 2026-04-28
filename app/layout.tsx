import './globals.css'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'BuyWise Kuwait',
  description: 'Share or paste a product link to get a Buy / Wait / Avoid verdict and compare Kuwait prices.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'BuyWise' }
}

export const viewport: Viewport = {
  themeColor: '#0f172a'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
