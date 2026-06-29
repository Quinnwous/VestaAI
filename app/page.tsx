import Link from 'next/link'
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'VestaAI — De AI-assistent voor makelaars',
  description:
    'VestaAI is de AI-assistent voor makelaars. Voer een woning in en ontvang direct Funda-tekst, brochure, Instagram-posts, LinkedIn-copy, koper-e-mail en buurtomschrijving.',
}

export default async function LandingPage() {
  // Ingelogde gebruiker → meteen naar dashboard
  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">VestaAI</span>
          <div className="flex items-center gap-6">
            <Link href="/prijzen" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Prijzen
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Inloggen →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-700 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
          Nu in beta — gratis testen
        </div>

        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
          De AI-assistent<br />
          <span className="text-blue-600">voor makelaars</span>
        </h1>

        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Voer een woning in en ontvang direct alle teksten die je nodig hebt — Funda-tekst,
          brochure, drie Instagram-varianten, LinkedIn-posts, koper-e-mail en buurtomschrijving.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/login"
            className="rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            Start gratis proefperiode →
          </Link>
          <Link
            href="/prijzen"
            className="rounded-xl border border-gray-200 px-8 py-4 text-base font-medium text-gray-700 hover:border-gray-300 transition-colors"
          >
            Bekijk prijzen
          </Link>
        </div>

        <p className="mt-4 text-sm text-gray-400">14 dagen gratis · Geen creditcard nodig</p>
      </section>

      {/* Social proof getallen */}
      <section className="border-y border-gray-100 bg-gray-50 py-10">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { getal: '10 teksten', label: 'Per object — klaar in één klik' },
              { getal: '7 types', label: 'Funda, brochure, social, e-mail & meer' },
              { getal: '€79/mo', label: 'Solo-abonnement' },
            ].map(({ getal, label }) => (
              <div key={label}>
                <p className="text-3xl font-bold text-gray-900">{getal}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hoe het werkt */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-16">
          Hoe het werkt
        </h2>
        <div className="grid md:grid-cols-3 gap-10">
          {[
            {
              stap: '1',
              titel: '8 velden invullen',
              tekst: 'Adres, woningtype, m², bouwjaar, energielabel, vraagprijs, USP\'s en doelgroep. Niet meer, niet minder.',
            },
            {
              stap: '2',
              titel: 'AI-assistent genereert alles',
              tekst: 'Onze AI-assistent op basis van Claude (Anthropic) schrijft alle teksten in één keer — gericht op jouw woning, doelgroep en huisstijl.',
            },
            {
              stap: '3',
              titel: 'Kopieer of exporteer',
              tekst: 'Kopieer elk stuk tekst met één klik of exporteer alles als PDF-brochure. Direct klaar voor Funda, social media of mail.',
            },
          ].map(({ stap, titel, tekst }) => (
            <div key={stap} className="flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                {stap}
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{titel}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{tekst}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Content-types */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Wat je krijgt
          </h2>
          <p className="text-gray-500 text-center mb-12">10 teksten, 7 content-types — per object, in één generatie</p>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: '🏠', titel: 'Funda-tekst', desc: '600–800 woorden, Funda-regelset ingebakken' },
              { icon: '📄', titel: 'Brochure (kort + lang)', desc: '200 én 500+ woorden — beide klaar' },
              { icon: '📸', titel: 'Instagram (3 varianten)', desc: 'Emotioneel, informatief en actie-gericht' },
              { icon: '💼', titel: 'LinkedIn (2 varianten)', desc: 'Voor het kantoor én de individuele makelaar' },
              { icon: '✉️', titel: 'Koper-e-mail', desc: 'Persoonlijke opvolgmail voor geïnteresseerde kopers' },
              { icon: '📍', titel: 'Buurtomschrijving', desc: 'Sfeervolle tekst over de buurt en omgeving' },
            ].map(({ icon, titel, desc }) => (
              <div key={titel} className="flex gap-4 rounded-2xl bg-white border border-gray-100 p-5">
                <div className="text-2xl flex-shrink-0">{icon}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{titel}</p>
                  <p className="text-xs text-gray-500 mt-1">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Huisstijl feature */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <div className="rounded-3xl bg-blue-50 border border-blue-100 p-10 md:p-14 text-center">
          <div className="text-4xl mb-4">🎨</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            VestaAI leert jóuw stijl
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto leading-relaxed">
            Upload je logo, stel je schrijftoon in (formeel / informeel / enthousiast) en voeg
            voorbeeldteksten toe. Elke generatie past zich automatisch aan jouw merkidentiteit aan.
            Alleen beschikbaar in het <strong>Kantoor</strong>-plan.
          </p>
        </div>
      </section>

      {/* Prijzen preview */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Simpele prijzen</h2>
          <p className="text-gray-500 mb-12">14 dagen gratis proberen — daarna kies je pas.</p>

          <div className="grid md:grid-cols-2 gap-6 text-left">
            {[
              {
                naam: 'Solo',
                prijs: '€79',
                per: '/maand',
                desc: 'Voor de zelfstandige makelaar',
                features: ['30 objecten per maand', '1 gebruiker', 'Alle content-types', 'PDF-export'],
                highlighted: false,
              },
              {
                naam: 'Kantoor',
                prijs: '€149',
                per: '/maand',
                desc: 'Voor het volledige team',
                features: ['Onbeperkt objecten', '5 gebruikers', 'Huisstijlgeheugen (logo, toon, voorbeelden)', 'Prioriteit-support'],
                highlighted: true,
              },
            ].map(({ naam, prijs, per, desc, features, highlighted }) => (
              <div
                key={naam}
                className={`rounded-2xl p-8 border ${highlighted
                  ? 'border-blue-500 bg-white shadow-md'
                  : 'border-gray-200 bg-white'
                }`}
              >
                {highlighted && (
                  <div className="text-xs font-semibold text-blue-600 mb-3 uppercase tracking-wide">
                    Populairste keuze
                  </div>
                )}
                <h3 className="text-lg font-bold text-gray-900 mb-1">{naam}</h3>
                <p className="text-sm text-gray-500 mb-4">{desc}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-extrabold text-gray-900">{prijs}</span>
                  <span className="text-gray-400 text-sm">{per}</span>
                </div>
                <ul className="space-y-2.5 mb-8">
                  {features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`block w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors ${highlighted
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'border border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Gratis starten
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-6 text-sm text-gray-400">
            Jaarabonnement? <Link href="/prijzen" className="underline hover:text-gray-600">Bekijk kortingen →</Link>
          </p>
        </div>
      </section>

      {/* CTA footer */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Klaar om te starten?
        </h2>
        <p className="text-gray-500 mb-8">
          14 dagen gratis proberen. Geen creditcard nodig. Opzeggen wanneer je wilt.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-xl bg-blue-600 px-10 py-4 text-base font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Start gratis proefperiode →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between text-xs text-gray-400">
          <span>© 2026 VestaAI</span>
          <div className="flex gap-6">
            <Link href="/prijzen" className="hover:text-gray-600 transition-colors">Prijzen</Link>
            <Link href="/login" className="hover:text-gray-600 transition-colors">Inloggen</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
