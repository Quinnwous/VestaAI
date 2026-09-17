import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VestaAI',
    short_name: 'VestaAI',
    description:
      'Het platform voor makelaars, in de huisstijl van uw kantoor: woningwaardering, marktinzicht en een contentsuite in één omgeving.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F7FAF8',
    theme_color: '#1A6B45',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['business', 'productivity'],
    lang: 'nl',
  }
}
