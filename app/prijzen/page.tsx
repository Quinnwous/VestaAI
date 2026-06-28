import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Prijzen — VestaAI',
  description: 'Kies het abonnement dat bij jouw makelaarspraktijk past. Solo vanaf €79/maand, Kantoor vanaf €149/maand.',
}

const PLANS = [
  {
    naam: 'Solo',
    prijs_maand: 79,
    prijs_jaar: 790,
    per: 'maand',
    desc: 'Voor de zelfstandige makelaar',
    features: [
      '30 objecten per maand',
      '1 gebruiker',
      'Funda-tekst, brochure, social media, e-mail',
      'PDF-export',
      '14 dagen gratis proberen',
    ],
    niet_inbegrepen: ['Huisstijlgeheugen', 'Team-uitnodigingen'],
    highlighted: false,
    cta: 'Gratis starten',
  },
  {
    naam: 'Kantoor',
    prijs_maand: 149,
    prijs_jaar: 1490,
    per: 'maand',
    desc: 'Voor het volledige kantoor',
    features: [
      'Onbeperkt objecten',
      '5 gebruikers',
      'Funda-tekst, brochure, social media, e-mail',
      'PDF-export',
      'Huisstijlgeheugen (logo, schrijftoon, voorbeeldteksten)',
      'Team-uitnodigingen',
      '14 dagen gratis proberen',
    ],
    niet_inbegrepen: [],
    highlighted: true,
    cta: 'Gratis starten',
  },
] as const

export default function PrijzenPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors">
            VestaAI
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Inloggen →
          </Link>
        </div>
      </header>

      {/* Header */}
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-16 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          Simpele, eerlijke prijzen
        </h1>
        <p className="text-lg text-gray-500">
          14 dagen gratis proberen — geen creditcard nodig. Daarna kies je pas.
        </p>
      </section>

      {/* Plannen */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        {/* Maand / Jaar toggle — visueel, navigeert naar ankers */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex rounded-xl border border-gray-200 p-1 bg-gray-50">
            <span className="rounded-lg px-5 py-2 text-sm font-semibold bg-white shadow-sm text-gray-900">
              Per maand
            </span>
            <span className="px-5 py-2 text-sm text-gray-500">
              Per jaar <span className="text-green-600 font-medium">−17%</span>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {PLANS.map(plan => (
            <div
              key={plan.naam}
              className={`rounded-3xl border p-10 flex flex-col ${
                plan.highlighted
                  ? 'border-blue-500 bg-white shadow-xl shadow-blue-100'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {plan.highlighted && (
                <div className="inline-block self-start rounded-full bg-blue-600 px-3 py-0.5 text-xs font-semibold text-white mb-4">
                  Meest gekozen
                </div>
              )}

              <h2 className="text-xl font-bold text-gray-900 mb-1">{plan.naam}</h2>
              <p className="text-sm text-gray-500 mb-6">{plan.desc}</p>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-extrabold text-gray-900">€{plan.prijs_maand}</span>
                <span className="text-gray-400">/maand</span>
              </div>
              <p className="text-sm text-gray-400 mb-8">
                Of €{plan.prijs_jaar}/jaar — bespaar €{plan.prijs_maand * 12 - plan.prijs_jaar}
              </p>

              <Link
                href="/login"
                className={`block w-full rounded-xl py-3.5 text-center text-sm font-semibold transition-colors mb-8 ${
                  plan.highlighted
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="space-y-3 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-3 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
                {plan.niet_inbegrepen.map(f => (
                  <li key={f} className="flex items-start gap-3 text-sm text-gray-400">
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Franchise */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Franchise of groot kantoor?</h3>
          <p className="text-sm text-gray-500 mb-4">
            Onbeperkt gebruikers, onbeperkt vestigingen, white-label optie en API-toegang.
            Vanaf €499/maand — op maat.
          </p>
          <a
            href="mailto:quinn.berkouwer@gmail.com?subject=VestaAI Franchise"
            className="inline-block rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
          >
            Neem contact op →
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">Veelgestelde vragen</h2>
          <div className="space-y-8">
            {[
              {
                v: 'Hoe werkt de gratis proefperiode?',
                a: 'Je maakt een account aan — geen creditcard nodig. Je hebt 14 dagen lang volledige toegang tot alle functies van het Kantoor-plan. Daarna kies je zelf welk abonnement je wilt.',
              },
              {
                v: 'Kan ik tussentijds opzeggen?',
                a: 'Ja, je kunt maandelijks opzeggen. Bij een jaarabonnement loopt het door tot het einde van de betaalperiode.',
              },
              {
                v: 'Wat is het verschil tussen Solo en Kantoor?',
                a: 'Solo is voor één gebruiker met een limiet van 30 objecten per maand. Kantoor heeft geen limieten, ondersteuning voor 5 gebruikers en het huisstijlgeheugen: Claude leert jouw schrijfstijl, logo en kleur.',
              },
              {
                v: 'Wordt er Nederlands gegenereerd?',
                a: 'Ja — VestaAI genereert uitsluitend Nederlandse content, afgestemd op de Nederlandse en Belgische vastgoedmarkt en Funda-richtlijnen.',
              },
              {
                v: 'Wat kost het per gegenereerd object?',
                a: 'Bij het Solo-plan: €79 / 30 = ±€2,65 per object. Bij Kantoor is het onbeperkt. De achterliggende API-kosten zijn voor ons rekening.',
              },
            ].map(({ v, a }) => (
              <div key={v}>
                <p className="text-sm font-semibold text-gray-900 mb-2">{v}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Begin vandaag nog</h2>
        <p className="text-gray-500 mb-8">14 dagen gratis proberen · Geen creditcard · Altijd opzegbaar</p>
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
            <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
            <Link href="/login" className="hover:text-gray-600 transition-colors">Inloggen</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
