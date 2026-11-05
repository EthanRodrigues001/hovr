import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { SITE_URL } from '@/lib/site'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'], display: 'swap' })

const TITLE = 'HOVR: a Dynamic Island for your AI limits'
const DESCRIPTION =
  'HOVR is a free Dynamic Island for Windows. A live notch at the top of your screen shows what is left on Claude Code, Codex, Cursor, Antigravity and Grok, when each limit resets, and which runs out first.'

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
    'API cost tracker'
  ],
  authors: [{ name: 'Ethan Rodrigues', url: 'https://github.com/EthanRodrigues001' }],
  creator: 'Ethan Rodrigues',
  category: 'developer tools',
  alternates: { canonical: '/' },
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
