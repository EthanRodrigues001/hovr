import type { Metadata } from 'next'
import { OgLight } from '@/components/OgLight'

// Render source for the light social-card variants (/og/light/1 to 4). Not for visitors.
export const metadata: Metadata = { title: 'og light', robots: { index: false, follow: false } }

export function generateStaticParams() {
  return [1, 2, 3, 4].map((v) => ({ v: String(v) }))
}

export default async function Page({ params }: { params: Promise<{ v: string }> }) {
  const { v } = await params
  return <OgLight v={Number(v) || 1} />
}
