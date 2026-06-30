'use client'

import { useRef, useState } from 'react'

interface Props {
  objectId: string
  initieleNotitie: string | null
}

export function NotitieVeld({ objectId, initieleNotitie }: Props) {
  const [notitie, setNotitie] = useState(initieleNotitie ?? '')
  const [bewerkModus, setBewerkModus] = useState(false)
  const [bewerkTekst, setBewerkTekst] = useState(initieleNotitie ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const MAX = 2000

  const handleOpen = () => {
    setBewerkTekst(notitie)
    setBewerkModus(true)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleSave = async () => {
    setStatus('saving')
    try {
      const res = await fetch(`/api/object/${objectId}/notitie`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notitie: bewerkTekst }),
      })
      if (!res.ok) { setStatus('error'); return }
      setNotitie(bewerkTekst)
      setStatus('saved')
      setBewerkModus(false)
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('error')
    }
  }

  const handleCancel = () => {
    setBewerkTekst(notitie)
    setBewerkModus(false)
    setStatus('idle')
  }

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <h2 className="text-sm font-semibold text-gray-900">Interne notitie</h2>
          {status === 'saved' && <span className="text-xs text-green-600">✓ Opgeslagen</span>}
        </div>
        {!bewerkModus && (
          <button
            onClick={handleOpen}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            {notitie ? 'Bewerk' : 'Voeg toe'}
          </button>
        )}
      </div>

      {bewerkModus ? (
        <div className="space-y-2">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={bewerkTekst}
              onChange={e => setBewerkTekst(e.target.value)}
              maxLength={MAX}
              rows={4}
              placeholder="Bijv: klant wil formele toon, contact via email, bod verwacht volgende week..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <span className={`absolute bottom-2 right-2 text-xs ${
              bewerkTekst.length > MAX * 0.9 ? 'text-orange-500' : 'text-gray-300'
            }`}>
              {bewerkTekst.length}/{MAX}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={status === 'saving'}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {status === 'saving' ? 'Opslaan...' : 'Opslaan'}
            </button>
            <button
              onClick={handleCancel}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5"
            >
              Annuleer
            </button>
            {status === 'error' && <p className="text-xs text-red-600">Opslaan mislukt</p>}
          </div>
        </div>
      ) : notitie ? (
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{notitie}</p>
      ) : (
        <p className="text-xs text-gray-400 italic">Geen notitie — alleen zichtbaar voor uw team.</p>
      )}
    </div>
  )
}
