'use client'

import { useState } from 'react'

/**
 * AI USP-extractor (F7, zie CLAUDE.md § Hoofdstructuur): vertaalt het vrije
 * tekstveld uit de intake naar gestructureerde USP's, los van de
 * hoofdwaardering. Voedt zowel de waardering als de content-teksten.
 */
export function UspExtractorPaneel({ objectId, initieleUsps }: { objectId: string; initieleUsps: string[] }) {
  const [usps, setUsps] = useState<string[]>(initieleUsps)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')

  const analyseer = async () => {
    setBezig(true); setFout('')
    try {
      const res = await fetch(`/api/object/${objectId}/usps`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { setFout(json.error ?? 'Mislukt'); return }
      setUsps(json.usps ?? [])
    } catch {
      setFout('Netwerkfout')
    } finally {
      setBezig(false)
    }
  }

  return (
    <div style={{ borderRadius: 'var(--merk-radius-card-lg, 18px)', border: '1px solid #E6E9EC', background: '#fff', padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: usps.length > 0 ? 10 : 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#14181B', margin: 0 }}>USP&apos;s</p>
        <button type="button" onClick={analyseer} disabled={bezig} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--merk,#1A6B45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
          {bezig ? 'Analyseren…' : usps.length > 0 ? 'Opnieuw analyseren' : 'Analyseer bijzonderheden'}
        </button>
      </div>
      {fout && <p style={{ fontSize: 12, color: '#DC2626', margin: '4px 0 0' }}>{fout}</p>}
      {usps.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {usps.map(u => (
            <span key={u} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--merk,#1A6B45)', background: 'var(--merk-zacht,#F1F7F3)', borderRadius: 'var(--merk-radius-pill, 9999px)', padding: '4px 10px' }}>
              {u}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
