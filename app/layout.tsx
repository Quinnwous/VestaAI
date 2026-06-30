import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Newsreader } from 'next/font/google'
import './globals.css'
import { NavHeader } from '@/components/NavHeader'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vestaai.nl'

export const viewport: Viewport = {
  themeColor: '#1A6B45',
}

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'VestaAI — De AI-assistent voor makelaars',
    template: '%s — VestaAI',
  },
  description:
    'VestaAI genereert in 90 seconden een complete content-set per woning: Funda-tekst, brochure, social media, koper-e-mail en buurtomschrijving. Voor makelaars die efficiënt werken.',
  keywords: ['makelaars', 'AI-assistent', 'Funda-tekst', 'AI', 'NVM', 'VBO', 'brochure', 'vastgoed'],
  authors: [{ name: 'VestaAI' }],
  creator: 'VestaAI',
  openGraph: {
    type: 'website',
    locale: 'nl_NL',
    url: APP_URL,
    siteName: 'VestaAI',
    title: 'VestaAI — De AI-assistent voor makelaars',
    description:
      'In 90 seconden een complete content-set per woning: Funda-tekst, brochure, social media, koper-e-mail en buurtomschrijving. Voor makelaars die efficiënt werken.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VestaAI — de AI-assistent voor makelaars',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VestaAI — De AI-assistent voor makelaars',
    description: 'In 90 seconden een complete content-set per woning. Voor makelaars die efficiënt werken.',
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
      <body className={`${jakarta.variable} ${newsreader.variable} ${jakarta.className}`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Naar inhoud
        </a>
        <NavHeader />
        <div id="main-content">
          {children}
        </div>
      </body>
    </html>
  )
}
