'use client'

import { useState } from 'react'
import type { Makelaar, Kantoor } from '@/lib/supabase'
import { nodigTeamlidUit } from '../actions'

interface Props {
  teamleden: Makelaar[]
  kantoorId: string
  isAdmin: boolean
  kantoorPlan: Kantoor['plan']
}

export function TeamTab({ teamleden, kantoorId, isAdmin, kantoorPlan }: Props) {
  const [uitnodigEmail, setUitnodigEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const kanTeamGebruiken = kantoorPlan === 'kantoor' || kantoorPlan === 'franchise'

  const handleUitnodig = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')

    const result = await nodigTeamlidUit({ email: uitnodigEmail, kantoor_id: kantoorId })

    if (result.ok) {
      setStatus('sent')
      setUitnodigEmail('')
      setTimeout(() => setStatus('idle'), 3000)
    } else {
      setErrorMsg(result.error ?? 'Uitnodigen mislukt')
      setStatus('error')
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
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                lid.role === 'admin'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {lid.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Uitnodiging */}
      {isAdmin && (
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Collega uitnodigen</h2>

          {!kanTeamGebruiken ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-600">
                Teamleden toevoegen is beschikbaar vanaf het Kantoor-plan (€149/maand).
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
                disabled={status === 'sending'}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {status === 'sending' ? '...' : status === 'sent' ? 'Verzonden!' : 'Uitnodigen'}
              </button>
            </form>
          )}

          {status === 'error' && (
            <p className="mt-2 text-xs text-red-600">{errorMsg}</p>
          )}
        </div>
      )}
    </div>
  )
}
