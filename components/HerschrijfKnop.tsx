'use client'

import { useRef, useState } from 'react'

interface Props {
  objectId: string
  sleutel: string
  onNieuweTekst: (tekst: string) => void
}

export function HerschrijfKnop({ objectId, sleutel, onNieuweTekst }: Props) {
  const [open, setOpen] = useState(false)
  const [instructie, setInstructie] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleOpen = () => {
    setOpen(true)
    setFout('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleHerschrijf = async () => {
    setBezig(true)
    setFout('')
    try {
      const res = await fetch(`/api/object/${objectId}/herschrijf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sleutel, instructie }),
      })
      if (!res.ok) {
        const json = await res.json()
        setFout(json.error ?? 'Herschrijven mislukt')
        return
      }
      const { nieuweTekst } = await res.json()
      onNieuweTekst(nieuweTekst)
      setOpen(false)
      setInstructie('')
    } catch {
      setFout('Verbindingsfout — probeer opnieuw')
    } finally {
      setBezig(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-300 rounded-md px-2.5 py-1 transition-colors"
        title="Herschrijf dit onderdeel opnieuw met Claude"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Herschrijf
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-blue-700">Herschrijfinstructie (optioneel)</span>
        <button
          onClick={() => { setOpen(false); setFout('') }}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
      <textarea
        ref={inputRef}
        value={instructie}
        onChange={e => setInstructie(e.target.value)}
        placeholder="Bijv: gebruik een andere openingszin — of laat leeg voor een volledig nieuwe versie"
        rows={2}
        className="w-full rounded border border-blue-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
      />
      {fout && <p className="text-xs text-red-600">{fout}</p>}
      <button
        onClick={handleHerschrijf}
        disabled={bezig}
        className="self-end rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {bezig ? 'Herschrijven...' : 'Herschrijf →'}
      </button>
    </div>
  )
}
