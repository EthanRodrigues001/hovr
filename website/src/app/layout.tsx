import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { SITE_URL } from '@/lib/site'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'], display: 'swap' })

const TITLE = 'HOVR: Claude Code, Codex & Cursor usage limits in a notch'
// Kept under 160 characters so Google does not cut it off in results.
const DESCRIPTION =
  'A free, open source Windows notch that shows what is left on Claude Code, Codex, Cursor, Antigravity and Grok, when each limit resets, and which runs out first.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: '%s | HOVR' },
  description: DESCRIPTION,
  applicationName: 'HOVR',
  keywords: [
    'AI usage limits',
    'Claude Code usage',
    'Claude Code limits',
    'Codex usage limit',
    'Cursor usage',
    'rate limit tracker',
    'AI coding tools',
    'Windows notch app',
    'token usage monitor',
    'API cost tracker',
    'Claude Code rate limit',
    'Claude Code 5-hour limit',
    'Claude weekly limit',
    'Codex rate limit checker',
    'Cursor usage limit',
    'Antigravity quota',
    'Grok usage',
    'AI usage dashboard',
    'AI token usage tracker',
    'Dynamic Island for Windows',
    'Windows notch overlay',
    'AI coding limits monitor',
    'open source usage tracker',
    'Electron desktop app'
  ],
  authors: [{ name: 'Ethan Rodrigues', url: 'https://github.com/EthanRodrigues001' }],
  creator: 'Ethan Rodrigues',
  category: 'developer tools',
  alternates: { canonical: '/' },
  verification: { google: 'J5b-_iX5_adxPQ4ezZ2A3QN3ImCOzB7H15UpEB14TMc' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'HOVR',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_US'
    // images: app/opengraph-image.png is picked up automatically
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: 'See what is left on Claude Code, Codex, Cursor and more, in a notch at the top of your Windows screen.'
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#050505',
  colorScheme: 'dark'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body>{children}</body>
    </html>
  )
}
