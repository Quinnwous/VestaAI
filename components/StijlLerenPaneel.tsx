'use client'

import { useState, useEffect } from 'react'

/**
 * "Leren van je bewerkingen" — verhuisd uit de vroegere huisstijl-instellingen
 * naar het woningdossier zelf (besluit 16 sep 2026, zie CLAUDE.md): huisstijl
 * is platform-admin-beheerd, maar het kantoor keurt de uit zíjn eigen
 * tekstbewerkingen gedestilleerde schrijfregels zelf goed — geen apart
 * instellingenscherm nodig. Toont zichzelf pas zodra er genoeg bewerkingen zijn.
 */
export function StijlLerenPaneel() {
  const [aantal, setAantal] = useState(0)
  const [minimum, setMinimum] = useState(4)
  const [bezig, setBezig] = useState(false)
  const [regels, setRegels] = useState<string | null>(null)
  const [ids, setIds] = useState<string[]>([])
  const [fout, setFout] = useState('')
  const [klaar, setKlaar] = useState<'toegepast' | 'genegeerd' | null>(null)

  useEffect(() => {
    fetch('/api/huisstijl/leren')
      .then(r => r.json())
      .then((d: { aantal?: number; minimum?: number }) => { setAantal(d.aantal ?? 0); if (d.minimum) setMinimum(d.minimum) })
      .catch(() => {})
  }, [])

  const analyseer = async () => {
    setBezig(true); setFout(''); setKlaar(null)
    const res = await fetch('/api/huisstijl/leren', { method: 'POST' })
    if (res.ok) {
      const { regels: r, ids: i } = (await res.json()) as { regels: string; ids: string[] }
      setRegels(r); setIds(i)
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Analyse mislukt' }))
      setFout(error ?? 'Analyse mislukt')
    }
    setBezig(false)
  }

  const rondAf = async (accepteer: boolean) => {
    setBezig(true); setFout('')
    const res = await fetch('/api/huisstijl/leren/toepassen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, ...(accepteer ? { regels } : {}) }),
    })
    if (res.ok) {
      setRegels(null); setIds([]); setAantal(0)
      setKlaar(accepteer ? 'toegepast' : 'genegeerd')
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Mislukt' }))
      setFout(error ?? 'Mislukt')
    }
    setBezig(false)
  }

  if (aantal < minimum && !regels && !klaar) return null

  return (
    <div style={{ borderTop: '1px solid #EBEEF1', paddingTop: 20, marginTop: 20 }}>
      <p style={{ fontSize: 13.5, fontWeight: 700, color: '#14181B', margin: '0 0 4px' }}>Leren van je bewerkingen</p>
      <p style={{ fontSize: 12.5, color: '#98A0A6', margin: '0 0 12px', lineHeight: 1.5 }}>
        Als je gegenereerde teksten handmatig aanpast, zien we dat als voorbeeld. Laat er stijlregels uit destilleren — jij bepaalt of ze kloppen.
      </p>

      {!regels && klaar !== 'toegepast' && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-700 mb-3">
            {aantal >= minimum ? `We verzamelden ${aantal} bewerking${aantal === 1 ? '' : 'en'} om van te leren.` : `Nog te weinig bewerkingen (minimaal ${minimum}).`}
          </p>
          {aantal >= minimum && (
            <button
              type="button"
              onClick={analyseer}
              disabled={bezig}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white rounded-lg px-4 py-2 disabled:opacity-60"
              style={{ background: 'var(--merk,#1A6B45)' }}
            >
              {bezig ? 'Analyseren…' : `Analyseer ${aantal} bewerking${aantal === 1 ? '' : 'en'}`}
            </button>
          )}
          {klaar === 'genegeerd' && <p className="text-xs text-gray-500 mt-2">Voorstel genegeerd.</p>}
        </div>
      )}

      {regels && (
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--merk-rand,#BBE3CE)', background: 'var(--merk-zacht,#F1FAF5)' }}>
          <p className="text-sm font-semibold text-gray-900 mb-2">We hebben dit geleerd — kloppen deze regels?</p>
          <pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-sans mb-3">{regels}</pre>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => rondAf(true)} disabled={bezig} className="text-sm font-semibold text-white rounded-lg px-4 py-2 disabled:opacity-60" style={{ background: 'var(--merk,#1A6B45)' }}>
              {bezig ? 'Bezig…' : 'Toevoegen aan onze stijl'}
            </button>
            <button type="button" onClick={() => rondAf(false)} disabled={bezig} className="text-sm font-semibold text-gray-600 rounded-lg px-4 py-2 border border-gray-300 hover:bg-gray-50 disabled:opacity-60">
              Negeren
            </button>
          </div>
        </div>
      )}

      {klaar === 'toegepast' && (
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--merk-rand,#BBE3CE)', background: 'var(--merk-zacht,#F1FAF5)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--merk-hover,#166534)' }}>✓ Toegevoegd aan onze stijl</p>
          <p className="text-xs text-gray-600 mt-1">Deze regels worden voortaan toegepast bij het genereren.</p>
        </div>
      )}

      {fout && <p className="text-xs text-red-600 mt-2">{fout}</p>}
    </div>
  )
}
