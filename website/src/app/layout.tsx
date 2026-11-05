import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })

const SITE = 'https://hovr-ten.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: 'HOVR: your AI usage limits, in a notch',
  description:
    'HOVR shows how much of your Claude Code, Codex, Cursor and other AI tool limits you have left, in a small notch at the top of your Windows screen.',
  openGraph: {
    title: 'HOVR: your AI usage limits, in a notch',
    description: 'See what is left on every AI coding tool at a glance. Free for Windows.',
    type: 'website',
    images: ['/banner.png']
  },
  twitter: { card: 'summary_large_image', images: ['/banner.png'] },
  icons: { icon: '/icon.png' }
}

export const viewport: Viewport = { themeColor: '#050505' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body>{children}</body>
    </html>
  )
}
