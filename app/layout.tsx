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
    default: 'VestaAI — De AI-assistent voor makelaars',
    template: '%s — VestaAI',
  },
  description:
    'VestaAI is de AI-assistent voor makelaars. Voer een woning in en ontvang direct Funda-tekst, brochure, Instagram-posts, LinkedIn-copy, koper-e-mail en buurtomschrijving.',
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
      'De AI-assistent voor makelaars. Voer een woning in en ontvang direct alle teksten die je nodig hebt: Funda, brochure, social media, koper-e-mail en buurtomschrijving.',
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
    description: 'Voer een woning in en ontvang direct alle teksten die je nodig hebt.',
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
