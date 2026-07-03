import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Newsreader } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

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
  adjustFontFallback: false,
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vestaai.nl'

export const viewport: Viewport = {
  themeColor: '#1A6B45',
}

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'VestaAI — De AI-toolkit voor makelaars',
    template: '%s — VestaAI',
  },
  description:
    'VestaAI is de complete AI-toolkit voor makelaars: professionele Funda-teksten, brochures, social media, koper-e-mails, documentanalyse en meer. Afgestemd op de Nederlandse vastgoedmarkt.',
  keywords: ['makelaars', 'AI-toolkit', 'AI-assistent', 'Funda-tekst', 'AI', 'NVM', 'VBO', 'brochure', 'vastgoed'],
  authors: [{ name: 'VestaAI' }],
  creator: 'VestaAI',
  openGraph: {
    type: 'website',
    locale: 'nl_NL',
    url: APP_URL,
    siteName: 'VestaAI',
    title: 'VestaAI — De AI-toolkit voor makelaars',
    description:
      'Van Funda-tekst tot koper-e-mail — VestaAI genereert razendsnel professionele content die voldoet aan alle richtlijnen. Afgestemd op uw huisstijl.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VestaAI — de AI-toolkit voor makelaars',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VestaAI — De AI-toolkit voor makelaars',
    description: 'De complete AI-toolkit voor makelaars. Van Funda-tekst tot documentanalyse — alles in één platform.',
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
      <head>
        <Script
          defer
          data-domain="vestaai.nl"
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${jakarta.variable} ${newsreader.variable} ${jakarta.className}`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Naar inhoud
        </a>
        <div id="main-content">
          {children}
        </div>
      </body>
    </html>
  )
}
