'use client'

import { useState, useRef } from 'react'

const STIJLEN = [
  { value: 'modern', label: 'Modern' },
  { value: 'scandinavisch', label: 'Scandinavisch' },
  { value: 'industrieel', label: 'Industrieel' },
  { value: 'klassiek', label: 'Klassiek' },
  { value: 'bohemian', label: 'Bohemian' },
  { value: 'minimalistisch', label: 'Minimalistisch' },
] as const

const RUIMTES = [
  { value: 'woonkamer', label: 'Woonkamer' },
  { value: 'slaapkamer', label: 'Slaapkamer' },
  { value: 'eetkamer', label: 'Eetkamer' },
  { value: 'keuken', label: 'Keuken' },
  { value: 'badkamer', label: 'Badkamer' },
  { value: 'werkkamer', label: 'Werkkamer' },
] as const

type Stijl = typeof STIJLEN[number]['value']
type Ruimte = typeof RUIMTES[number]['value']

interface StagingResultaat {
  origineel: string     // object URL van de upload
  gestaged: string      // data URL van het Gemini-resultaat
  stijl: string
  ruimte: string
}

export function VirtualStaging({ objectId, onBewaard }: { objectId?: string; onBewaard?: () => void }) {
  const [stijl, setStijl] = useState<Stijl>('modern')
  const [ruimte, setRuimte] = useState<Ruimte>('woonkamer')
  const [resultaten, setResultaten] = useState<StagingResultaat[]>([])
  const [verwerken, setVerwerken] = useState(false)
  const [error, setError] = useState('')
  const [actief, setActief] = useState<number | null>(null)
  const [toonOrigineel, setToonOrigineel] = useState(false)
  const [bewaardStatus, setBewaardStatus] = useState<Record<number, 'bezig' | 'klaar'>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  async function bewaarInBibliotheek(item: StagingResultaat, index: number) {
    if (!objectId || bewaardStatus[index]) return
    setBewaardStatus(s => ({ ...s, [index]: 'bezig' }))
    const res = await fetch(`/api/object/${objectId}/fotos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl: item.gestaged, soort: 'gestaged', bestandsnaam: `staging_${item.ruimte}_${item.stijl}.jpg` }),
    }).catch(() => null)
    if (res?.ok) {
      setBewaardStatus(s => ({ ...s, [index]: 'klaar' }))
      onBewaard?.()
    } else {
      setBewaardStatus(s => { const n = { ...s }; delete n[index]; return n })
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const bestand = e.target.files?.[0]
    if (!bestand) return

    setVerwerken(true)
    setError('')

    const origineelUrl = URL.createObjectURL(bestand)

    const fd = new FormData()
    fd.append('foto', bestand)
    fd.append('stijl', stijl)
    fd.append('ruimte', ruimte)

    const res = await fetch('/api/fotos/staging', { method: 'POST', body: fd })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Staging mislukt')
      setVerwerken(false)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    const gestagedUrl = `data:${data.mime_type};base64,${data.image_base64}`

    const stijlLabel = STIJLEN.find(s => s.value === data.stijl)?.label ?? data.stijl
    const ruimteLabel = RUIMTES.find(r => r.value === data.ruimte)?.label ?? data.ruimte

    const item: StagingResultaat = {
      origineel: origineelUrl,
      gestaged: gestagedUrl,
      stijl: stijlLabel,
      ruimte: ruimteLabel,
    }

    setResultaten(prev => {
      const nieuw = [...prev, item]
      setActief(nieuw.length - 1)
      return nieuw
    })
    setToonOrigineel(false)
    setVerwerken(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function downloadGestaged(item: StagingResultaat) {
    const a = document.createElement('a')
    a.href = item.gestaged
    a.download = `staging_${item.ruimte}_${item.stijl}.jpg`
    a.click()
  }

  const huidig = actief !== null ? resultaten[actief] : null

  return (
    <div className="space-y-5">
      {/* Opties */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Ruimte</label>
          <select
            value={ruimte}
            onChange={e => setRuimte(e.target.value as Ruimte)}
            disabled={verwerken}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1A6B45] disabled:opacity-50"
          >
            {RUIMTES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Interieurstijl</label>
          <select
            value={stijl}
            onChange={e => setStijl(e.target.value as Stijl)}
            disabled={verwerken}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1A6B45] disabled:opacity-50"
          >
            {STIJLEN.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Upload knop */}
      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          className="hidden"
          id="staging-upload"
          disabled={verwerken}
        />
        <label
          htmlFor="staging-upload"
          className={`inline-flex items-center gap-2 text-sm font-medium rounded-xl border border-gray-200 bg-white px-4 py-2.5 cursor-pointer hover:border-[#1A6B45] hover:text-[#1A6B45] transition-colors shadow-sm ${verwerken ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
        >
          {verwerken ? (
            <>
              <span className="w-4 h-4 border-2 border-gray-200 border-t-[#1A6B45] rounded-full animate-spin" />
              Gemini AI richt de ruimte in…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Kamer uploaden en virtueel inrichten
            </>
          )}
        </label>
        <span className="text-xs text-gray-400 ml-3">JPG · PNG · WebP · max 20 MB · ca. 30–60 sec</span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {verwerken && (
        <div className="rounded-xl bg-[#F1F7F3] border border-[#C7E6D5] p-4">
          <div className="flex items-center gap-3">
            <span className="w-5 h-5 border-2 border-[#C7E6D5] border-t-[#1A6B45] rounded-full animate-spin flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#1A6B45]">Gemini AI is aan het werk…</p>
              <p className="text-xs text-[#4A9970] mt-0.5">De ruimte wordt virtueel ingericht in {STIJLEN.find(s => s.value === stijl)?.label}-stijl. Dit duurt 30–60 seconden.</p>
            </div>
          </div>
        </div>
      )}

      {/* Thumbnail rij */}
      {resultaten.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {resultaten.map((r, i) => (
            <button
              key={i}
              onClick={() => { setActief(i); setToonOrigineel(false) }}
              className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === actief ? 'border-[#1A6B45] shadow-md' : 'border-gray-200 opacity-60 hover:opacity-90'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.gestaged} alt="" className="w-full h-full object-cover" />
              <span className="absolute bottom-0.5 left-0.5 right-0.5 text-center" style={{ fontSize: 8, fontWeight: 700, color: '#1A6B45', background: 'rgba(255,255,255,.85)', borderRadius: 3, padding: '1px 2px' }}>{r.stijl}</span>
            </button>
          ))}
        </div>
      )}

      {/* Detail */}
      {huidig && (
        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">{huidig.ruimte} · {huidig.stijl}</span>
            <div className="flex items-center gap-2">
              <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden text-xs font-semibold">
                <button
                  onClick={() => setToonOrigineel(true)}
                  className={`px-3 py-1.5 transition-colors ${toonOrigineel ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Origineel
                </button>
                <button
                  onClick={() => setToonOrigineel(false)}
                  className={`px-3 py-1.5 transition-colors ${!toonOrigineel ? 'bg-[#1A6B45] text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Gestaged
                </button>
              </div>
              <button
                onClick={() => downloadGestaged(huidig)}
                className="text-xs font-semibold text-[#1A6B45] hover:text-[#114230] transition-colors px-2 py-1.5"
              >
                Download ↓
              </button>
              {objectId && actief !== null && (
                <button
                  onClick={() => bewaarInBibliotheek(huidig, actief)}
                  disabled={!!bewaardStatus[actief]}
                  className="text-xs font-semibold text-[#1A6B45] hover:text-[#114230] transition-colors px-2 py-1.5 disabled:opacity-60"
                >
                  {bewaardStatus[actief] === 'klaar' ? 'Bewaard ✓' : bewaardStatus[actief] === 'bezig' ? 'Bewaren…' : 'Bewaar in bibliotheek'}
                </button>
              )}
            </div>
          </div>
          <div className="relative aspect-video bg-gray-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={toonOrigineel ? huidig.origineel : huidig.gestaged}
              alt={toonOrigineel ? 'Originele kamer' : 'Virtueel gestaged'}
              className="w-full h-full object-contain"
            />
            <span className="absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded-md bg-black/50 text-white">
              {toonOrigineel ? 'Origineel' : `Gestaged · ${huidig.stijl}`}
            </span>
          </div>
        </div>
      )}

      {!verwerken && resultaten.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <svg className="w-8 h-8 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          </svg>
          <p className="text-sm font-medium text-gray-500">Upload een foto van een lege of sparse kamer</p>
          <p className="text-xs text-gray-400 mt-1">Gemini AI richt de ruimte virtueel in de gekozen stijl in — klaar voor Funda.</p>
        </div>
      )}
    </div>
  )
}
