'use client'

import { useState } from 'react'
import type { Kantoor, Makelaar } from '@/lib/supabase'
import { slaProfielNaamOp } from '../actions'

interface Props {
  makelaar: Makelaar
  kantoor: Kantoor
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
  const [naamBewerkModus, setNaamBewerkModus] = useState(false)
  const [naam, setNaam] = useState(makelaar.name)
  const [naamStatus, setNaamStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const handleNaamOpslaan = async () => {
    setNaamStatus('saving')
    const result = await slaProfielNaamOp(naam)
    if (result.ok) {
      setNaamStatus('saved')
      setNaamBewerkModus(false)
      setTimeout(() => setNaamStatus('idle'), 2000)
    } else {
      setNaamStatus('error')
    }
  }

  return (
    <div className="space-y-8 max-w-md">

      {/* Profiel */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Profiel</h2>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Naam — bewerkbaar */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-xs text-gray-500">Naam</p>
                {!naamBewerkModus && (
                  <button
                    onClick={() => setNaamBewerkModus(true)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Bewerk
                  </button>
                )}
              </div>
              {naamBewerkModus ? (
                <div className="space-y-1.5">
                  <input
                    value={naam}
                    onChange={e => setNaam(e.target.value)}
                    maxLength={100}
                    autoFocus
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleNaamOpslaan}
                      disabled={naamStatus === 'saving'}
                      className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {naamStatus === 'saving' ? 'Opslaan...' : 'Opslaan'}
                    </button>
                    <button
                      onClick={() => { setNaam(makelaar.name); setNaamBewerkModus(false) }}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                    >
                      Annuleer
                    </button>
                  </div>
                  {naamStatus === 'error' && (
                    <p className="text-xs text-red-600">Opslaan mislukt</p>
                  )}
                </div>
              ) : (
                <p className="text-sm font-medium text-gray-900">
                  {naam || <span className="text-gray-400 italic">Geen naam ingesteld</span>}
                  {naamStatus === 'saved' && <span className="ml-2 text-xs text-green-600">✓ Opgeslagen</span>}
                </p>
              )}
            </div>
            <Field label="Rol" value={makelaar.role === 'admin' ? 'Beheerder' : 'Medewerker'} />
          </div>
          <Field label="E-mail" value={makelaar.email} />
          <Field label="Kantoor" value={kantoor.name} />
        </div>
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
