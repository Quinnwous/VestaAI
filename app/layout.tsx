import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NavHeader } from '@/components/NavHeader'

const inter = Inter({ subsets: ['latin'] })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vestaai.nl'

export const viewport: Viewport = {
  themeColor: '#2563eb',
}

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'VestaAI — Professionele vastgoedcontent in 90 seconden',
    template: '%s — VestaAI',
  },
  description:
    'VestaAI genereert Funda-teksten, brochures en social media content voor makelaars. 8 velden invullen, complete content-suite ontvangen.',
  keywords: ['makelaars', 'vastgoedcontent', 'Funda-tekst', 'AI', 'NVM', 'VBO', 'brochure'],
  authors: [{ name: 'VestaAI' }],
  creator: 'VestaAI',
  openGraph: {
    type: 'website',
    locale: 'nl_NL',
    url: APP_URL,
    siteName: 'VestaAI',
    title: 'VestaAI — Professionele vastgoedcontent in 90 seconden',
    description:
      'Vul 8 velden in en ontvang in 90 seconden een complete content-suite: Funda-tekst, brochure, Instagram, LinkedIn, koper-e-mail en buurtomschrijving.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VestaAI — vastgoedcontent voor makelaars',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VestaAI — Professionele vastgoedcontent in 90 seconden',
    description: 'Vul 8 velden in en ontvang een complete content-suite voor je woning.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="nl">
      <body className={inter.className}>
        <NavHeader />
        {children}
      </body>
    </html>
  )
}
