import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HOVR',
    short_name: 'HOVR',
    description: 'AI usage limits in a notch at the top of your Windows screen.',
    start_url: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#050505',
    icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png' }]
  }
}
