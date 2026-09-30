import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Newsreader, Gantari, Nunito_Sans } from 'next/font/google'
import './globals.css'
import { APP_URL } from '@/lib/appUrl'

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

// Kantoor-lettertype-opties (zie lib/branding.ts § FONT_OPTIES). Hier vooraf geladen
// als CSS-variabele, net als jakarta/newsreader hierboven — next/font vereist statische
// imports, dus nieuwe kantoorfonts komen er hier ook bij.
// preload: false voor de kantoor-opties (les 29 sep 2026): een kantoor gebruikt er
// hooguit één, maar next/font preloadt élke font uit deze layout met hoge
// prioriteit op élke pagina — op traag 4G concurreerde dat met het JavaScript
// (5 fontbestanden, 217 kB). Zonder preload haalt de browser alleen het font op
// dat de CSS echt gebruikt; `display: swap` toont intussen de terugval.
const gantari = Gantari({
  subsets: ['latin'],
  variable: '--font-gantari',
  display: 'swap',
  preload: false,
  weight: ['400', '500', '600', '700'],
})

const nunito = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
  preload: false,
  weight: ['400', '500', '600', '700', '800'],
})

export const viewport: Viewport = {
  themeColor: '#1A6B45',
}

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'VestaAI — Platform voor makelaars',
    template: '%s — VestaAI',
  },
  description:
    'VestaAI is het platform voor Nederlandse makelaars, in de huisstijl van uw kantoor: woningwaardering, marktinzicht en concurrentieanalyse op uw eigen transactiedata, en een contentsuite voor Funda-teksten, brochures en social media.',
  keywords: ['makelaars', 'woningwaardering', 'marktinzicht', 'concurrentieanalyse', 'Funda-tekst', 'NVM', 'vastgoed', 'white-label'],
  authors: [{ name: 'VestaAI' }],
  creator: 'VestaAI',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'nl_NL',
    url: APP_URL,
    siteName: 'VestaAI',
    title: 'VestaAI — Platform voor makelaars',
    description:
      'Woningwaardering, marktinzicht en een contentsuite in de huisstijl van uw kantoor — op uw eigen transactiedata.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VestaAI — Platform voor makelaars',
    description: 'Woningwaardering, marktinzicht en een contentsuite in de huisstijl van uw kantoor.',
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
      {/* Plausible staat niet meer hier (item 14.1, 30 sep 2026): dit layout
          omvat óók de ingelogde omgeving (app/(app)/) en /admin, en de
          privacyverklaring belooft het script alleen op de publieke pagina's.
          Zie components/PlausibleScript.tsx, gemount per publieke pagina. */}
      <body className={`${jakarta.variable} ${newsreader.variable} ${gantari.variable} ${nunito.variable} ${jakarta.className}`}>
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
