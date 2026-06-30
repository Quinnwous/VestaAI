'use client'

import { useState, useRef } from 'react'

const STIJLEN = [
  { value: 'modern', label: 'Modern' },
  { value: 'scandinavian', label: 'Scandinavisch' },
  { value: 'industrial', label: 'Industrieel' },
  { value: 'classic', label: 'Klassiek' },
  { value: 'bohemian', label: 'Bohemian' },
] as const

const RUIMTES = [
  { value: 'living_room', label: 'Woonkamer' },
  { value: 'bedroom', label: 'Slaapkamer' },
  { value: 'dining_room', label: 'Eetkamer' },
  { value: 'kitchen', label: 'Keuken' },
  { value: 'bathroom', label: 'Badkamer' },
  { value: 'office', label: 'Werkkamer' },
] as const

type Stijl = typeof STIJLEN[number]['value']
type Ruimte = typeof RUIMTES[number]['value']

export function VirtualStaging() {
  const [stijl, setStijl] = useState<Stijl>('modern')
  const [ruimte, setRuimte] = useState<Ruimte>('living_room')
  const [resultaten, setResultaten] = useState<string[]>([])
  const [verwerken, setVerwerken] = useState(false)
  const [error, setError] = useState('')
  const [geconfigureerd, setGeconfigureerd] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const bestand = e.target.files?.[0]
    if (!bestand) return

    setVerwerken(true)
    setError('')
    setResultaten([])

    const fd = new FormData()
    fd.append('foto', bestand)
    fd.append('stijl', stijl)
    fd.append('ruimte', ruimte)

    const res = await fetch('/api/fotos/staging', { method: 'POST', body: fd })
    const data = await res.json()

    if (res.status === 503) {
      setGeconfigureerd(false)
      setError(data.error)
    } else if (res.ok && data.urls?.length > 0) {
      setResultaten(data.urls)
    } else {
      setError(data.error ?? 'Staging mislukt')
    }

    setVerwerken(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  if (!geconfigureerd) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-900">Virtual staging nog niet geconfigureerd</p>
        <p className="text-xs text-amber-700 mt-1">
          Voeg <code className="bg-amber-100 px-1 rounded">REIMAGINEHOME_API_KEY</code> toe aan uw{' '}
          <code className="bg-amber-100 px-1 rounded">.env.local</code>.{' '}
          Account aanmaken op{' '}
          <span className="underline">reimaginehome.ai/api</span>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Ruimte</label>
          <select
            value={ruimte}
            onChange={e => setRuimte(e.target.value as Ruimte)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {RUIMTES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Interieurstijl</label>
          <select
            value={stijl}
            onChange={e => setStijl(e.target.value as Stijl)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STIJLEN.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          className="hidden"
          id="staging-upload"
        />
        <label
          htmlFor="staging-upload"
          className={`inline-flex items-center gap-2 text-sm rounded-lg border border-gray-300 px-4 py-2 cursor-pointer hover:border-gray-400 transition-colors ${verwerken ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {verwerken ? 'Verwerken... (kan 30–60 seconden duren)' : 'Lege kamer uploaden en virtueel inrichten'}
        </label>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {verwerken && (
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <p className="text-sm text-blue-700">De AI richt de ruimte virtueel in. Dit duurt 30–60 seconden...</p>
          </div>
        </div>
      )}

      {resultaten.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {resultaten.map((url, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden border border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Virtual staging resultaat ${i + 1}`} className="w-full h-auto" />
              <a
                href={url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-2 right-2 bg-white/90 rounded-lg px-3 py-1.5 text-xs text-gray-700 hover:bg-white transition-colors shadow-sm"
              >
                Download
              </a>
            </div>
          ))}
        </div>
      )}

      {!verwerken && resultaten.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-500">Upload een foto van een lege kamer.</p>
          <p className="text-xs text-gray-400 mt-1">De AI richt de ruimte virtueel in de gekozen stijl in.</p>
        </div>
      )}
    </div>
  )
}
