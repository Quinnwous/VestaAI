'use client'

import Link from 'next/link'
import type { Kantoor, Makelaar } from '@/lib/supabase'

interface Props {
  makelaar: Makelaar
  kantoor: Kantoor
}

const PLAN_LABELS: Record<NonNullable<Kantoor['plan']>, string> = {
  solo: 'Solo',
  kantoor: 'Kantoor',
  franchise: 'Franchise',
}

const PLAN_PRIJZEN: Record<NonNullable<Kantoor['plan']>, string> = {
  solo: '€79/maand',
  kantoor: '€149/maand',
  franchise: '€499/maand',
}

const PLAN_FEATURES: Record<NonNullable<Kantoor['plan']>, string[]> = {
  solo: ['30 objecten per maand', '1 gebruiker'],
  kantoor: ['Onbeperkt objecten', '5 gebruikers', 'Huisstijlgeheugen'],
  franchise: ['Onbeperkt alles', 'White-label', 'API-toegang'],
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}

export function AccountTab({ makelaar, kantoor }: Props) {
  const trialEndsAt = kantoor.trial_ends_at ? new Date(kantoor.trial_ends_at) : null
  const now = new Date()
  const isTrialActive = trialEndsAt ? trialEndsAt > now : false
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0
  const TRIAL_DAYS = 14
  const trialProgress = Math.round(((TRIAL_DAYS - daysLeft) / TRIAL_DAYS) * 100)

  return (
    <div className="space-y-8 max-w-md">

      {/* Profiel */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Profiel</h2>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Naam" value={makelaar.name} />
            <Field label="Rol" value={makelaar.role === 'admin' ? 'Beheerder' : 'Medewerker'} />
          </div>
          <Field label="E-mail" value={makelaar.email} />
          <Field label="Kantoor" value={kantoor.name} />
        </div>
      </section>

      {/* Abonnement */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Abonnement</h2>

        {kantoor.plan ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-green-900">{PLAN_LABELS[kantoor.plan]}</p>
                <p className="text-xs text-green-700">{PLAN_PRIJZEN[kantoor.plan]} · Actief</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-800">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Actief
              </span>
            </div>
            <ul className="space-y-1">
              {PLAN_FEATURES[kantoor.plan].map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-green-800">
                  <svg className="w-3.5 h-3.5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            {kantoor.plan === 'solo' && (
              <div className="mt-4 pt-3 border-t border-green-200">
                <p className="text-xs text-green-700 mb-2">Wil je meer? Upgrade naar Kantoor.</p>
                <Link
                  href="/api/stripe/checkout?plan=kantoor"
                  className="inline-block text-xs rounded-lg bg-blue-600 px-3 py-1.5 text-white font-medium hover:bg-blue-700 transition-colors"
                >
                  Upgrade naar Kantoor — €149/mo
                </Link>
              </div>
            )}
          </div>
        ) : isTrialActive ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-amber-900">Gratis proefperiode</p>
                <p className="text-xs text-amber-700">
                  {daysLeft === 0 ? 'Verloopt vandaag' : `Nog ${daysLeft} dag${daysLeft === 1 ? '' : 'en'}`}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
                {daysLeft} dag{daysLeft === 1 ? '' : 'en'}
              </span>
            </div>

            {/* Voortgangsbalk */}
            <div className="h-1.5 bg-amber-200 rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${trialProgress}%` }}
              />
            </div>

            <p className="text-xs text-amber-800 mb-4">
              Kies een abonnement om na je proefperiode door te gaan.
              <Link href="/prijzen" className="underline ml-1">Vergelijk plannen →</Link>
            </p>

            <div className="flex gap-2 flex-wrap">
              <Link
                href="/api/stripe/checkout?plan=solo"
                className="text-xs rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors"
              >
                Solo — €79/mo
              </Link>
              <Link
                href="/api/stripe/checkout?plan=kantoor"
                className="text-xs rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 font-medium hover:border-gray-400 transition-colors"
              >
                Kantoor — €149/mo
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-bold text-red-900 mb-1">Proefperiode verlopen</p>
            <p className="text-xs text-red-700 mb-4">
              Je toegang is beperkt. Kies een abonnement om verder te gaan.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Link
                href="/api/stripe/checkout?plan=solo"
                className="text-xs rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors"
              >
                Solo — €79/mo
              </Link>
              <Link
                href="/api/stripe/checkout?plan=kantoor"
                className="text-xs rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 font-medium hover:border-gray-400 transition-colors"
              >
                Kantoor — €149/mo
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Gevaar-zone */}
      <section className="border-t border-gray-100 pt-6">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="text-sm text-red-600 hover:text-red-700 transition-colors"
          >
            Uitloggen
          </button>
        </form>
      </section>
    </div>
  )
}
