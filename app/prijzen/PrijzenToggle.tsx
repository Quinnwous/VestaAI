'use client'

import { useState } from 'react'
import Link from 'next/link'

const PLANS = [
  {
    naam: 'Starter',
    plan: 'starter',
    prijs_maand: 60,
    prijs_jaar: 600,
    desc: 'Voor de makelaar die instapt',
    features: [
      '5 objecten per maand',
      '1 gebruiker',
      'Alle woningteksten',
      'Fotoverbetering & PDF-export',
      '14 dagen gratis proberen',
    ],
    niet_inbegrepen: ['Huisstijlgeheugen', 'Virtual staging & kalender'],
    highlighted: false,
  },
  {
    naam: 'Pro',
    plan: 'pro',
    prijs_maand: 150,
    prijs_jaar: 1500,
    desc: 'Voor de makelaar die alles wil',
    features: [
      'Onbeperkt objecten',
      '1 gebruiker',
      'Alle woningteksten',
      'Huisstijlgeheugen (logo, schrijftoon, voorbeeldteksten)',
      'Virtual staging, kalender & chatbot',
      '14 dagen gratis proberen',
    ],
    niet_inbegrepen: [],
    highlighted: true,
  },
  {
    naam: 'Kantoor',
    plan: 'kantoor',
    prijs_maand: 500,
    prijs_jaar: 5000,
    desc: 'Voor kantoren die consistentie willen in elke woningpresentatie',
    features: [
      'Onbeperkt gebruikers & objecten',
      'Bouw de kantoorhuisstijl op in VestaAI',
      'Alle makelaars genereren in dezelfde stijl',
      'White-label & eigen branding',
      'Virtual staging, kalender & chatbot',
      'Binnenkort: API & multi-vestiging',
      '14 dagen gratis proberen',
    ],
    niet_inbegrepen: [],
    highlighted: false,
  },
] as const

export function PrijzenToggle() {
  const [perJaar, setPerJaar] = useState(false)

  return (
    <>
      {/* Maand / Jaar toggle */}
      <div className="flex flex-col items-center gap-2 mb-12">
        <div className="inline-flex rounded-xl border border-gray-200 p-1 bg-gray-50">
          <button
            onClick={() => setPerJaar(false)}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
              !perJaar ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Per maand
          </button>
          <button
            onClick={() => setPerJaar(true)}
            className={`px-5 py-2 text-sm font-semibold transition-colors rounded-lg ${
              perJaar ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Per jaar{' '}
            <span className="font-semibold text-green-700 bg-green-100 rounded-full px-2 py-0.5 text-xs ml-1">
              2 mnd gratis
            </span>
          </button>
        </div>
        {!perJaar && (
          <p className="text-xs text-gray-400">
            Kies jaarabonnement en betaal{' '}
            <span className="font-semibold text-green-700">2 maanden gratis</span>
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6">
        {PLANS.map(plan => {
          const prijs = perJaar ? Math.round(plan.prijs_jaar / 12) : plan.prijs_maand
          const besparing = plan.prijs_maand * 12 - plan.prijs_jaar

          return (
            <div
              key={plan.naam}
              className={`rounded-3xl border p-8 flex flex-col ${
                plan.highlighted
                  ? 'border-green-600 bg-white shadow-xl shadow-green-100'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {plan.highlighted && (
                <div className="inline-block self-start rounded-full bg-green-700 px-3 py-0.5 text-xs font-semibold text-white mb-4">
                  Meest gekozen
                </div>
              )}

              <h2 className="text-xl font-bold text-gray-900 mb-1">{plan.naam}</h2>
              <p className="text-sm text-gray-500 mb-6">{plan.desc}</p>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-extrabold text-gray-900">€{prijs}</span>
                <span className="text-gray-400">/maand</span>
              </div>
              <p className="text-sm text-gray-400 mb-8">
                {perJaar
                  ? `€${plan.prijs_jaar}/jaar — u bespaart €${besparing}`
                  : `Of €${plan.prijs_jaar}/jaar — bespaar €${besparing}`}
              </p>

              <Link
                href="/login?aanmelden=1"
                className={`block w-full rounded-xl py-3.5 text-center text-sm font-semibold transition-colors mb-8 ${
                  plan.highlighted
                    ? 'bg-green-700 text-white hover:bg-green-800'
                    : 'border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                Gratis starten
              </Link>

              <ul className="space-y-3 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-3 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          )
        })}
      </div>
    </>
  )
}
