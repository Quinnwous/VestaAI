'use client'

import { useState, useRef, useCallback } from 'react'

interface FotoAnalyse {
  score_belichting: number
  score_kadrering: number
  score_kleur: number
  funda_geschikt: boolean
  samenvatting: string
  aanbevelingen: string[]
  correcties: { brightness: number; contrast: number; saturation: number; sharpness: number }
}

interface ResultItem {
  origineel: string    // data URL
  verbeterd: string   // data URL
  analyse: FotoAnalyse
  bestandsnaam: string
}

interface Props {
  objectId: string
  onBewaard?: () => void
}

function ScoreBadge({ label, score }: { label: string; score: number }) {
  const color = score >= 8 ? '#1A6B45' : score >= 6 ? '#C18B00' : '#B91C1C'
  const bg = score >= 8 ? '#EAF5EE' : score >= 6 ? '#FFF7ED' : '#FEF2F2'
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{score}<span style={{ fontSize: 13, fontWeight: 500, color: '#9AA6A0' }}>/10</span></div>
      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2, background: bg, borderRadius: 6, padding: '2px 6px', display: 'inline-block' }}>{label}</div>
    </div>
  )
}

export function FotoVerbetering({ objectId, onBewaard }: Props) {
  const [resultaten, setResultaten] = useState<ResultItem[]>([])
  const [bezig, setBezig] = useState(false)
  const [error, setError] = useState('')
  const [actief, setActief] = useState<number | null>(null)
  const [toonVerbeterd, setToonVerbeterd] = useState(true)
  const [bewaardStatus, setBewaardStatus] = useState<Record<number, 'bezig' | 'klaar'>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  async function bewaarInBibliotheek(item: ResultItem, index: number) {
    if (bewaardStatus[index]) return
    setBewaardStatus(s => ({ ...s, [index]: 'bezig' }))
    const res = await fetch(`/api/object/${objectId}/fotos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl: item.verbeterd, soort: 'verbeterd', bestandsnaam: item.bestandsnaam }),
    }).catch(() => null)
    if (res?.ok) {
      setBewaardStatus(s => ({ ...s, [index]: 'klaar' }))
      onBewaard?.()
    } else {
      setBewaardStatus(s => { const n = { ...s }; delete n[index]; return n })
    }
  }

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const bestand = e.target.files?.[0]
    if (!bestand) return

    setBezig(true)
    setError('')

    const origineel = URL.createObjectURL(bestand)

    const fd = new FormData()
    fd.append('foto', bestand)
    fd.append('object_id', objectId)

    const res = await fetch('/api/fotos/verbeter', { method: 'POST', body: fd })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Analyse mislukt')
      setBezig(false)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    const verbeterd = data.verbeterd_jpeg_base64
      ? `data:image/jpeg;base64,${data.verbeterd_jpeg_base64}`
      : origineel

    const item: ResultItem = {
      origineel,
      verbeterd,
      analyse: data.analyse as FotoAnalyse,
      bestandsnaam: bestand.name,
    }

    setResultaten(prev => {
      const nieuw = [...prev, item]
      setActief(nieuw.length - 1)
      return nieuw
    })

    setBezig(false)
    if (fileRef.current) fileRef.current.value = ''
  }, [objectId])

  function downloadVerbeterd(item: ResultItem) {
    const a = document.createElement('a')
    a.href = item.verbeterd
    a.download = `verbeterd_${item.bestandsnaam.replace(/\.[^.]+$/, '')}.jpg`
    a.click()
  }

  const huidig = actief !== null ? resultaten[actief] : null

  return (
    <div className="space-y-5">
      {/* Upload knop */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          className="hidden"
          id="foto-upload"
          disabled={bezig}
        />
        <label
          htmlFor="foto-upload"
          className={`inline-flex items-center gap-2 text-sm font-medium rounded-xl border border-gray-200 bg-white px-4 py-2.5 cursor-pointer hover:border-[#1A6B45] hover:text-[#1A6B45] transition-colors shadow-sm ${bezig ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
        >
          {bezig ? (
            <>
              <span className="w-4 h-4 border-2 border-gray-200 border-t-[#1A6B45] rounded-full animate-spin" />
              Analyseren met Claude AI…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Foto uploaden voor AI-analyse
            </>
          )}
        </label>
        <span className="text-xs text-gray-400">JPG · PNG · WebP · max 20 MB</span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Thumbnail rij */}
      {resultaten.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {resultaten.map((r, i) => (
            <button
              key={i}
              onClick={() => setActief(i)}
              className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === actief ? 'border-[#1A6B45] shadow-md' : 'border-gray-200 opacity-60 hover:opacity-90'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.verbeterd} alt="" className="w-full h-full object-cover" />
              <span className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${r.analyse.funda_geschikt ? 'bg-[#1A6B45]' : 'bg-amber-500'}`}>
                {r.analyse.funda_geschikt ? '✓' : '!'}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Detail weergave */}
      {huidig && (
        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
          {/* Voor/na toggle */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700 truncate max-w-xs">{huidig.bestandsnaam}</span>
            <div className="flex items-center gap-2">
              <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden text-xs font-semibold">
                <button
                  onClick={() => setToonVerbeterd(false)}
                  className={`px-3 py-1.5 transition-colors ${!toonVerbeterd ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Origineel
                </button>
                <button
                  onClick={() => setToonVerbeterd(true)}
                  className={`px-3 py-1.5 transition-colors ${toonVerbeterd ? 'bg-[#1A6B45] text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Verbeterd
                </button>
              </div>
              <button
                onClick={() => downloadVerbeterd(huidig)}
                className="text-xs font-semibold text-[#1A6B45] hover:text-[#114230] transition-colors px-2 py-1.5"
              >
                Download ↓
              </button>
              {actief !== null && (
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

          {/* Foto */}
          <div className="relative aspect-video bg-gray-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={toonVerbeterd ? huidig.verbeterd : huidig.origineel}
              alt="Woningfoto"
              className="w-full h-full object-contain"
            />
            <span className="absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded-md bg-black/50 text-white">
              {toonVerbeterd ? 'Verbeterd' : 'Origineel'}
            </span>
          </div>

          {/* Scores */}
          <div className="px-5 py-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-6">
                <ScoreBadge label="Belichting" score={huidig.analyse.score_belichting} />
                <ScoreBadge label="Kadrering" score={huidig.analyse.score_kadrering} />
                <ScoreBadge label="Kleur" score={huidig.analyse.score_kleur} />
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${huidig.analyse.funda_geschikt ? 'bg-[#EAF5EE] text-[#1A6B45]' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                {huidig.analyse.funda_geschikt ? '✓ Funda-klaar' : '⚠ Nog niet Funda-klaar'}
              </span>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-4">{huidig.analyse.samenvatting}</p>

            {huidig.analyse.aanbevelingen.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Aanbevelingen</div>
                <ul className="space-y-1.5">
                  {huidig.analyse.aanbevelingen.map((tip, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-600">
                      <span className="text-[#1A6B45] font-bold flex-shrink-0">→</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {resultaten.length === 0 && !bezig && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <svg className="w-8 h-8 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-medium text-gray-500">Upload een woningfoto</p>
          <p className="text-xs text-gray-400 mt-1">Claude AI analyseert belichting, kadrering en kleur — en verbetert de foto automatisch.</p>
        </div>
      )}
    </div>
  )
}
