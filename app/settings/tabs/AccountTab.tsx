'use client'

import Link from 'next/link'
import type { Kantoor, Makelaar } from '@/lib/supabase'

interface Props {
  makelaar: Makelaar
  kantoor: Kantoor
}

const PLAN_LABELS = {
  solo: 'Solo (€79/maand)',
  kantoor: 'Kantoor (€149/maand)',
  franchise: 'Franchise (€499/maand)',
}

export function AccountTab({ makelaar, kantoor }: Props) {
  const trialEndsAt = kantoor.trial_ends_at ? new Date(kantoor.trial_ends_at) : null
  const isTrialActive = trialEndsAt ? trialEndsAt > new Date() : false
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <div className="space-y-8 max-w-md">
      {/* Profiel */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Profiel</h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Naam</p>
            <p className="text-sm font-medium text-gray-900">{makelaar.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">E-mail</p>
            <p className="text-sm text-gray-700">{makelaar.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Kantoor</p>
            <p className="text-sm text-gray-700">{kantoor.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Rol</p>
            <p className="text-sm text-gray-700 capitalize">{makelaar.role}</p>
          </div>
        </div>
      </div>

      {/* Abonnement */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Abonnement</h2>
        {kantoor.plan ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-900">{PLAN_LABELS[kantoor.plan]}</p>
            <p className="text-xs text-green-700 mt-0.5">Actief abonnement</p>
          </div>
        ) : isTrialActive ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-amber-900">Proefperiode</p>
              <p className="text-xs text-amber-700 mt-0.5">{daysLeft} dag{daysLeft === 1 ? '' : 'en'} resterend</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link
                href="/api/stripe/checkout?plan=solo"
                className="text-xs rounded-lg bg-blue-600 px-3 py-1.5 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                Solo — €79/mo
              </Link>
              <Link
                href="/api/stripe/checkout?plan=kantoor"
                className="text-xs rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:border-gray-400 transition-colors"
              >
                Kantoor — €149/mo
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
            <p className="text-sm font-medium text-red-900">Proefperiode verlopen</p>
            <div className="flex gap-2 flex-wrap">
              <Link
                href="/api/stripe/checkout?plan=solo"
                className="text-xs rounded-lg bg-blue-600 px-3 py-1.5 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                Solo — €79/mo
              </Link>
              <Link
                href="/api/stripe/checkout?plan=kantoor"
                className="text-xs rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:border-gray-400 transition-colors"
              >
                Kantoor — €149/mo
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Uitloggen */}
      <div className="border-t border-gray-100 pt-6">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="text-sm text-red-600 hover:text-red-700 transition-colors"
          >
            Uitloggen
          </button>
        </form>
      </div>
    </div>
  )
}
