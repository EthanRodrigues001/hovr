import type { Metadata } from 'next'
import { OgCard } from '@/components/OgCard'

// Render source for app/opengraph-image.png (see scripts/og.cjs). Not for visitors.
export const metadata: Metadata = { title: 'og', robots: { index: false, follow: false } }

export default function Og() {
  return <OgCard />
}
