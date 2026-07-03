'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Makelaar, Kantoor } from '@/lib/supabase'
import { nodigTeamlidUit, verwijderTeamlid } from '../actions'

function OnboardingBadge({ createdAt, firstGeneratedAt }: { createdAt: string; firstGeneratedAt: string | null }) {
  if (!firstGeneratedAt) {
    return (
      <span className="text-xs text-gray-400 hidden sm:inline" title="Nog geen generatie gestart">
        –
      </span>
    )
  }
  const signupMs = new Date(createdAt).getTime()
  const genMs = new Date(firstGeneratedAt).getTime()
  const diffMin = Math.round((genMs - signupMs) / 60000)
  const label = diffMin < 1 ? '<1 min' : diffMin < 60 ? `${diffMin} min` : `${Math.round(diffMin / 60)}u`
  const snel = diffMin <= 5
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded font-mono hidden sm:inline ${snel ? 'text-green-700 bg-green-50' : 'text-gray-500 bg-gray-50'}`}
      title={`Eerste generatie na ${diffMin} minuten`}
    >
      {label}
    </span>
  )
}

interface Props {
  teamleden: Makelaar[]
  kantoorId: string
  isAdmin: boolean
  kantoorPlan: Kantoor['plan']
  huidigeMakelaarsId: string
}

export function TeamTab({ teamleden, kantoorId, isAdmin, kantoorPlan, huidigeMakelaarsId }: Props) {
  const router = useRouter()
  const [uitnodigEmail, setUitnodigEmail] = useState('')
  const [uitnodigStatus, setUitnodigStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [uitnodigError, setUitnodigError] = useState('')
  const [verwijderenId, setVerwijderenId] = useState<string | null>(null)
  const [verwijderError, setVerwijderError] = useState('')

  const kanTeamGebruiken = kantoorPlan === 'pro' || kantoorPlan === 'kantoor'

  const handleUitnodig = async (e: React.FormEvent) => {
    e.preventDefault()
    setUitnodigStatus('sending')
    setUitnodigError('')

    const result = await nodigTeamlidUit({ email: uitnodigEmail, kantoor_id: kantoorId })

    if (result.ok) {
      setUitnodigStatus('sent')
      setUitnodigEmail('')
      setTimeout(() => setUitnodigStatus('idle'), 3000)
    } else {
      setUitnodigError(result.error ?? 'Uitnodigen mislukt')
      setUitnodigStatus('error')
    }
  }

  const handleVerwijder = async (makelaarId: string) => {
    setVerwijderenId(makelaarId)
    setVerwijderError('')

    const result = await verwijderTeamlid({ makelaar_id: makelaarId, kantoor_id: kantoorId })

    setVerwijderenId(null)
    if (!result.ok) {
      setVerwijderError(result.error ?? 'Verwijderen mislukt')
    } else {
      router.refresh()
    }
  }

  return (
    <div className="max-w-md space-y-8">
      {/* Teamoverzicht */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Teamleden ({teamleden.length})
        </h2>
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
          {teamleden.map(lid => (
            <div key={lid.id} className="flex items-center justify-between px-4 py-3 bg-white">
              <div>
                <p className="text-sm font-medium text-gray-900">{lid.name}</p>
                <p className="text-xs text-gray-500">{lid.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && lid.created_at && (
                  <OnboardingBadge
                    createdAt={lid.created_at}
                    firstGeneratedAt={lid.first_generated_at ?? null}
                  />
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  lid.role === 'admin'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {lid.role}
                </span>
                {isAdmin && lid.id !== huidigeMakelaarsId && (
                  <button
                    onClick={() => handleVerwijder(lid.id)}
                    disabled={verwijderenId === lid.id}
                    aria-label={`${lid.name} verwijderen`}
                    className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                  >
                    {verwijderenId === lid.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {verwijderError && (
          <p className="mt-2 text-xs text-red-600">{verwijderError}</p>
        )}
      </div>

      {/* Uitnodiging */}
      {isAdmin && (
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Collega uitnodigen</h2>

          {!kanTeamGebruiken ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-600">
                Teamleden toevoegen is beschikbaar vanaf het Pro-plan (€150/maand).
              </p>
            </div>
          ) : (
            <form onSubmit={handleUitnodig} className="flex gap-2 mt-3">
              <input
                type="email"
                value={uitnodigEmail}
                onChange={e => setUitnodigEmail(e.target.value)}
                required
                placeholder="collega@kantoor.nl"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={uitnodigStatus === 'sending'}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {uitnodigStatus === 'sending' ? '...' : uitnodigStatus === 'sent' ? 'Verzonden!' : 'Uitnodigen'}
              </button>
            </form>
          )}

          {uitnodigStatus === 'error' && (
            <p className="mt-2 text-xs text-red-600">{uitnodigError}</p>
          )}
        </div>
      )}
    </div>
  )
}
