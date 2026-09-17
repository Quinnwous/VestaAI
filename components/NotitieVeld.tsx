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
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 style={{ fontSize: 13.5, fontWeight: 700, color: '#14181B', margin: 0 }}>Interne notitie</h2>
          {status === 'saved' && <span className="text-xs text-[var(--merk)]">✓ Opgeslagen</span>}
        </div>
        {!bewerkModus && (
          <button
            onClick={handleOpen}
            style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--merk)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {notitie ? 'Bewerken' : 'Voeg toe'}
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--merk)] resize-none"
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
              className="text-xs bg-[var(--merk)] text-[var(--merk-op)] px-3 py-1.5 rounded-lg hover:bg-[var(--merk-hover)] disabled:opacity-50 transition-colors"
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
        <p style={{ fontSize: 13.5, color: '#5C6470', lineHeight: 1.6, margin: 0, background: '#F7F8F9', borderRadius: 'var(--merk-radius-md, 12px)', padding: '13px 15px', whiteSpace: 'pre-wrap' }}>{notitie}</p>
      ) : (
        <p style={{ fontSize: 13, color: '#98A0A6', fontStyle: 'italic', margin: 0, background: '#F7F8F9', borderRadius: 'var(--merk-radius-md, 12px)', padding: '13px 15px' }}>Geen notitie — alleen zichtbaar voor je team.</p>
      )}
    </div>
  )
}
