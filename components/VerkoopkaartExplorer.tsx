'use client'

import { useMemo, useState } from 'react'
import { VerkoopkaartClient } from './VerkoopkaartClient'
import type { TransactieMetCoordinaten } from '@/lib/supabase'

const PERIODES = [
  { label: 'Alles', maanden: 0 },
  { label: '12 mnd', maanden: 12 },
  { label: '24 mnd', maanden: 24 },
  { label: '5 jaar', maanden: 60 },
] as const

/**
 * Interactieve verkoopkaart met live filters (besluit 16 sep 2026: geen
 * statisch dashboard, wel schuivers/knoppen die de kaart meteen bijwerken —
 * zie CLAUDE.md § Hoofdstructuur). Filtert client-side, want de dataset van
 * één kantoor is klein genoeg om in het geheugen te doorzoeken.
 */
export function VerkoopkaartExplorer({ transacties }: { transacties: TransactieMetCoordinaten[] }) {
  const [periode, setPeriode] = useState<number>(0)
  const [type, setType] = useState<string>('')
  const [maxPrijs, setMaxPrijs] = useState<number>(0)

  const types = useMemo(
    () => Array.from(new Set(transacties.map(t => t.woningtype).filter((v): v is string => !!v))).sort(),
    [transacties],
  )
  const hoogstePrijs = useMemo(
    () => transacties.reduce((max, t) => Math.max(max, t.verkoopprijs ?? 0), 0),
    [transacties],
  )

  const gefilterd = useMemo(() => {
    const grens = periode > 0 ? Date.now() - periode * 30 * 24 * 60 * 60 * 1000 : 0
    return transacties.filter(t => {
      if (grens > 0 && (!t.verkoopdatum || new Date(t.verkoopdatum).getTime() < grens)) return false
      if (type && t.woningtype !== type) return false
      if (maxPrijs > 0 && (t.verkoopprijs ?? 0) > maxPrijs) return false
      return true
    })
  }, [transacties, periode, type, maxPrijs])

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 11.5, fontWeight: 700, color: '#98A0A6', textTransform: 'uppercase', letterSpacing: '.04em', margin: '0 0 6px' }}>Periode</p>
          <div style={{ display: 'inline-flex', borderRadius: 10, overflow: 'hidden', border: '1px solid #E1E5E9' }}>
            {PERIODES.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPeriode(p.maanden)}
                style={{ padding: '7px 13px', fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer', background: periode === p.maanden ? 'var(--merk,#1A6B45)' : '#fff', color: periode === p.maanden ? '#fff' : '#5C6470' }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {types.length > 0 && (
          <div>
            <p style={{ fontSize: 11.5, fontWeight: 700, color: '#98A0A6', textTransform: 'uppercase', letterSpacing: '.04em', margin: '0 0 6px' }}>Woningtype</p>
            <select value={type} onChange={e => setType(e.target.value)} style={{ borderRadius: 10, border: '1px solid #E1E5E9', padding: '7px 10px', fontSize: 12.5, background: '#fff' }}>
              <option value="">Alle types</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}

        {hoogstePrijs > 0 && (
          <div style={{ minWidth: 220 }}>
            <p style={{ fontSize: 11.5, fontWeight: 700, color: '#98A0A6', textTransform: 'uppercase', letterSpacing: '.04em', margin: '0 0 6px' }}>
              Max. prijs {maxPrijs > 0 ? `— €${maxPrijs.toLocaleString('nl-NL')}` : ''}
            </p>
            <input
              type="range" min={0} max={hoogstePrijs} step={25000}
              value={maxPrijs || hoogstePrijs}
              onChange={e => setMaxPrijs(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        )}

        <p style={{ fontSize: 12.5, color: '#98A0A6', marginLeft: 'auto' }}>{gefilterd.length} van {transacties.length} verkopen</p>
      </div>

      <VerkoopkaartClient transacties={gefilterd} hoogte={560} />
    </div>
  )
}
