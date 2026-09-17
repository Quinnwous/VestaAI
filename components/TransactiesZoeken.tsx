'use client'

import { useMemo, useState } from 'react'
import type { TransactieRow } from '@/lib/supabase'

function formatEuro(bedrag: number | null): string {
  return bedrag !== null ? `€${bedrag.toLocaleString('nl-NL')}` : '—'
}

function formatDatum(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Transacties opzoeken — losse zoekfunctie over de transactiedataset, los van
 * de geaggregeerde grafieken in Marktanalyse (zie CLAUDE.md § Hoofdstructuur).
 * "Meenemen als referentie in een waardebepaling" (F6) wacht nog op Module B
 * (de waarderingsmodule, F7) — de selectie hieronder is alvast klaar, de
 * knop wordt actief zodra die module bestaat.
 */
const PER_PAGINA = 50

export function TransactiesZoeken({ transacties }: { transacties: TransactieRow[] }) {
  const [zoek, setZoek] = useState('')
  const [type, setType] = useState('')
  const [minM2, setMinM2] = useState('')
  const [maxM2, setMaxM2] = useState('')
  const [energielabel, setEnergielabel] = useState('')
  const [geselecteerd, setGeselecteerd] = useState<Set<string>>(new Set())
  const [pagina, setPagina] = useState(0)

  const types = useMemo(() => Array.from(new Set(transacties.map(t => t.woningtype).filter((v): v is string => !!v))).sort(), [transacties])
  const labels = useMemo(() => Array.from(new Set(transacties.map(t => t.energielabel).filter((v): v is string => !!v))).sort(), [transacties])

  const resultaten = useMemo(() => transacties.filter(t => {
    if (zoek && !`${t.adres} ${t.postcode ?? ''} ${t.wijk ?? ''} ${t.buurt ?? ''}`.toLowerCase().includes(zoek.toLowerCase())) return false
    if (type && t.woningtype !== type) return false
    if (minM2 && (t.woonoppervlak_m2 ?? 0) < Number(minM2)) return false
    if (maxM2 && (t.woonoppervlak_m2 ?? Infinity) > Number(maxM2)) return false
    if (energielabel && t.energielabel !== energielabel) return false
    return true
  }).sort((a, b) => (b.verkoopdatum ?? '').localeCompare(a.verkoopdatum ?? '')), [transacties, zoek, type, minM2, maxM2, energielabel])

  // Duizenden rijen tegelijk renderen maakt de pagina traag; 50 per pagina zoals het prototype.
  const aantalPaginas = Math.max(1, Math.ceil(resultaten.length / PER_PAGINA))
  const huidigePagina = Math.min(pagina, aantalPaginas - 1)
  const zichtbaar = resultaten.slice(huidigePagina * PER_PAGINA, (huidigePagina + 1) * PER_PAGINA)
  const metReset = <T,>(zet: (v: T) => void) => (v: T) => { zet(v); setPagina(0) }

  const toggleSelectie = (id: string) => {
    setGeselecteerd(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  if (transacties.length === 0) {
    return (
      <div style={{ borderRadius: 'var(--merk-radius-card-lg, 18px)', border: '1px dashed #E1E5E9', background: '#FAFBFB', padding: '48px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13.5, color: '#98A0A6', maxWidth: 360, margin: '0 auto' }}>
          Nog geen transacties geïmporteerd — dit scherm vult zich automatisch zodra de dataset binnen is.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          type="search" value={zoek} onChange={e => metReset(setZoek)(e.target.value)}
          placeholder="Zoek op adres, postcode, wijk of buurt…"
          style={{ flex: '1 1 260px', borderRadius: 10, border: '1px solid #E1E5E9', padding: '9px 12px', fontSize: 13.5 }}
        />
        <select value={type} onChange={e => metReset(setType)(e.target.value)} style={{ borderRadius: 10, border: '1px solid #E1E5E9', padding: '9px 12px', fontSize: 13.5, background: '#fff' }}>
          <option value="">Alle types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="number" value={minM2} onChange={e => metReset(setMinM2)(e.target.value)} placeholder="Min. m²" style={{ width: 100, borderRadius: 10, border: '1px solid #E1E5E9', padding: '9px 12px', fontSize: 13.5 }} />
        <input type="number" value={maxM2} onChange={e => metReset(setMaxM2)(e.target.value)} placeholder="Max. m²" style={{ width: 100, borderRadius: 10, border: '1px solid #E1E5E9', padding: '9px 12px', fontSize: 13.5 }} />
        {labels.length > 0 && (
          <select value={energielabel} onChange={e => metReset(setEnergielabel)(e.target.value)} style={{ borderRadius: 10, border: '1px solid #E1E5E9', padding: '9px 12px', fontSize: 13.5, background: '#fff' }}>
            <option value="">Alle labels</option>
            {labels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
      </div>

      <p style={{ fontSize: 12.5, color: '#98A0A6', marginBottom: 10 }}>{resultaten.length} van {transacties.length} transacties</p>

      <div style={{ borderRadius: 'var(--merk-radius-card-lg, 18px)', border: '1px solid #E6E9EC', overflow: 'hidden', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#FAFBFB', borderBottom: '1px solid #E6E9EC' }}>
              <th style={{ padding: '9px 12px', textAlign: 'left', width: 32 }}></th>
              <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11.5, color: '#98A0A6', fontWeight: 700 }}>Adres</th>
              <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11.5, color: '#98A0A6', fontWeight: 700 }}>Type</th>
              <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 11.5, color: '#98A0A6', fontWeight: 700 }}>m²</th>
              <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 11.5, color: '#98A0A6', fontWeight: 700 }}>Verkoopprijs</th>
              <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11.5, color: '#98A0A6', fontWeight: 700 }}>Datum</th>
              <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11.5, color: '#98A0A6', fontWeight: 700 }}>Label</th>
            </tr>
          </thead>
          <tbody>
            {zichtbaar.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #F1F3F5' }}>
                <td style={{ padding: '9px 12px' }}>
                  <input type="checkbox" checked={geselecteerd.has(t.id)} onChange={() => toggleSelectie(t.id)} />
                </td>
                <td style={{ padding: '9px 12px', color: '#14181B', fontWeight: 600 }}>{t.adres}</td>
                <td style={{ padding: '9px 12px', color: '#5C6470' }}>{t.woningtype ?? '—'}</td>
                <td style={{ padding: '9px 12px', color: '#5C6470', textAlign: 'right' }}>{t.woonoppervlak_m2 ?? '—'}</td>
                <td style={{ padding: '9px 12px', color: '#5C6470', textAlign: 'right' }}>{formatEuro(t.verkoopprijs)}</td>
                <td style={{ padding: '9px 12px', color: '#5C6470' }}>{formatDatum(t.verkoopdatum)}</td>
                <td style={{ padding: '9px 12px', color: '#5C6470' }}>{t.energielabel ?? '—'}</td>
              </tr>
            ))}
            {resultaten.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '24px 12px', textAlign: 'center', color: '#98A0A6', fontSize: 12.5 }}>Geen transacties gevonden — pas de filters aan.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {aantalPaginas > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 }}>
          <p style={{ fontSize: 12.5, color: '#98A0A6', margin: 0 }}>
            {huidigePagina * PER_PAGINA + 1}–{Math.min((huidigePagina + 1) * PER_PAGINA, resultaten.length)} van {resultaten.length}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'Vorige', naar: huidigePagina - 1, uit: huidigePagina === 0 },
              { label: 'Volgende', naar: huidigePagina + 1, uit: huidigePagina >= aantalPaginas - 1 },
            ].map(k => (
              <button
                key={k.label} type="button" disabled={k.uit} onClick={() => setPagina(k.naar)}
                style={{ borderRadius: 10, border: '1px solid #E1E5E9', background: '#fff', padding: '7px 14px', fontSize: 13, fontWeight: 600, color: k.uit ? '#98A0A6' : 'var(--merk)', cursor: k.uit ? 'default' : 'pointer' }}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {geselecteerd.size > 0 && (
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, borderRadius: 12, background: 'var(--merk-zacht)', border: '1px solid var(--merk-rand)', padding: '10px 14px' }}>
          <p style={{ fontSize: 12.5, color: '#2C3238', margin: 0 }}>
            {geselecteerd.size} geselecteerd — meenemen als referentie in een waardebepaling komt beschikbaar zodra de waarderingsmodule er is.
          </p>
        </div>
      )}
    </div>
  )
}
