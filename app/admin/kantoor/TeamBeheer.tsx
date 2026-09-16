'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { verwijderMakelaar } from '../actions'

type Teamlid = { id: string; name: string; email: string }

export function TeamBeheer({ kantoorId, teamleden }: { kantoorId: string; teamleden: Teamlid[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [bezigId, setBezigId] = useState<string | null>(null)

  const verwijder = (lid: Teamlid) => {
    if (!confirm(`${lid.name || lid.email} verwijderen uit dit kantoor?`)) return
    setBezigId(lid.id)
    startTransition(async () => {
      const res = await verwijderMakelaar(lid.id, kantoorId)
      if (!res.ok) alert(res.error ?? 'Verwijderen mislukt')
      setBezigId(null)
      router.refresh()
    })
  }

  return (
    <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden max-w-md">
      {teamleden.map(lid => (
        <div key={lid.id} className={`flex items-center justify-between px-4 py-3 bg-white ${pending && bezigId === lid.id ? 'opacity-50' : ''}`}>
          <div>
            <p className="text-sm font-medium text-gray-900">{lid.name || '—'}</p>
            <p className="text-xs text-gray-500">{lid.email}</p>
          </div>
          <button
            onClick={() => verwijder(lid)}
            disabled={pending && bezigId === lid.id}
            aria-label={`${lid.name} verwijderen`}
            className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      {teamleden.length === 0 && (
        <p className="px-4 py-6 text-center text-xs text-gray-400">Nog geen teamleden — voeg er een toe via het formulier hierboven.</p>
      )}
    </div>
  )
}
