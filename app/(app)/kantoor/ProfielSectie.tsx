'use client'

import { useState } from 'react'
import { slaProfielNaamOp } from './actions'

/** Enige zelfbeheer op deze pagina: je eigen weergavenaam. */
export function ProfielSectie({ naam: initieleNaam, email }: { naam: string; email: string }) {
  const [bewerkModus, setBewerkModus] = useState(false)
  const [naam, setNaam] = useState(initieleNaam)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const opslaan = async () => {
    setStatus('saving')
    const result = await slaProfielNaamOp(naam)
    if (result.ok) {
      setStatus('saved')
      setBewerkModus(false)
      setTimeout(() => setStatus('idle'), 2000)
    } else {
      setStatus('error')
    }
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 grid grid-cols-2 gap-4 max-w-md">
      <div>
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-xs text-gray-500">Naam</p>
          {!bewerkModus && (
            <button onClick={() => setBewerkModus(true)} className="text-xs text-[var(--merk,#1A6B45)] hover:text-[var(--merk-hover,#114230)]">
              Bewerk
            </button>
          )}
        </div>
        {bewerkModus ? (
          <div className="space-y-1.5">
            <input
              value={naam}
              onChange={e => setNaam(e.target.value)}
              maxLength={100}
              autoFocus
              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--merk,#1A6B45)]"
            />
            <div className="flex gap-1.5">
              <button
                onClick={opslaan}
                disabled={status === 'saving'}
                className="text-xs bg-[var(--merk,#1A6B45)] text-[var(--merk-op,#fff)] px-2.5 py-1 rounded hover:bg-[var(--merk-hover,#114230)] disabled:opacity-50"
              >
                {status === 'saving' ? 'Opslaan...' : 'Opslaan'}
              </button>
              <button onClick={() => { setNaam(initieleNaam); setBewerkModus(false) }} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">
                Annuleer
              </button>
            </div>
            {status === 'error' && <p className="text-xs text-red-600">Opslaan mislukt</p>}
          </div>
        ) : (
          <p className="text-sm font-medium text-gray-900">
            {naam || <span className="text-gray-400 italic">Geen naam ingesteld</span>}
            {status === 'saved' && <span className="ml-2 text-xs text-[var(--merk,#1A6B45)]">✓ Opgeslagen</span>}
          </p>
        )}
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">E-mail</p>
        <p className="text-sm font-medium text-gray-900">{email}</p>
      </div>
    </div>
  )
}
