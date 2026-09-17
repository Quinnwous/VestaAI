'use client'

import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { filterTransacties, naarKwartaalReeks, combineerReeksen, samenvatting, type MarktFilter } from '@/lib/marktanalyse'
import type { TransactieRow } from '@/lib/supabase'

const KLEUR_A = 'var(--merk)'
const KLEUR_B = 'var(--merk-accent)'

function FilterPaneel({
  titel, kleur, filter, onChange, types, wijken,
}: {
  titel: string
  kleur: string
  filter: MarktFilter
  onChange: (f: MarktFilter) => void
  types: string[]
  wijken: string[]
}) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: kleur, flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#5C6470', minWidth: 76 }}>{titel}</span>
      <select value={filter.woningtype ?? ''} onChange={e => onChange({ ...filter, woningtype: e.target.value || undefined })} style={{ borderRadius: 8, border: '1px solid #E1E5E9', padding: '6px 9px', fontSize: 12.5, background: '#fff' }}>
        <option value="">Alle types</option>
        {types.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      {wijken.length > 0 && (
        <select value={filter.wijk ?? ''} onChange={e => onChange({ ...filter, wijk: e.target.value || undefined })} style={{ borderRadius: 8, border: '1px solid #E1E5E9', padding: '6px 9px', fontSize: 12.5, background: '#fff' }}>
          <option value="">Alle wijken</option>
          {wijken.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      )}
      <input type="date" value={filter.vanaf ?? ''} onChange={e => onChange({ ...filter, vanaf: e.target.value || undefined })} style={{ borderRadius: 8, border: '1px solid #E1E5E9', padding: '6px 9px', fontSize: 12.5 }} />
      <span style={{ fontSize: 12, color: '#98A0A6' }}>t/m</span>
      <input type="date" value={filter.tot ?? ''} onChange={e => onChange({ ...filter, tot: e.target.value || undefined })} style={{ borderRadius: 8, border: '1px solid #E1E5E9', padding: '6px 9px', fontSize: 12.5 }} />
    </div>
  )
}

function StatKaart({ label, waarde }: { label: string; waarde: string }) {
  return (
    <div style={{ borderRadius: 'var(--merk-radius-lg, 14px)', border: '1px solid #E6E9EC', background: '#fff', padding: '14px 16px' }}>
      <p style={{ fontSize: 20, fontWeight: 700, color: '#14181B', margin: 0 }}>{waarde}</p>
      <p style={{ fontSize: 12, color: '#98A0A6', margin: '2px 0 0' }}>{label}</p>
    </div>
  )
}

/**
 * Interactieve marktanalyse-explorer (F6, besluit 16 sep 2026): schuivers en
 * filters die de grafieken live hertekenen, met optionele segmentvergelijking
 * (bv. twee woningtypes of twee periodes naast elkaar) — zie CLAUDE.md §
 * Hoofdstructuur. Draait op de volledige transactiedataset van het kantoor
 * (niet alleen eigen verkopen — dat onderscheid geldt alleen voor de kaart).
 */
export function MarktanalyseExplorer({ transacties }: { transacties: TransactieRow[] }) {
  const [filterA, setFilterA] = useState<MarktFilter>({})
  const [filterB, setFilterB] = useState<MarktFilter | null>(null)

  const types = useMemo(() => Array.from(new Set(transacties.map(t => t.woningtype).filter((v): v is string => !!v))).sort(), [transacties])
  const wijken = useMemo(() => Array.from(new Set(transacties.map(t => t.wijk).filter((v): v is string => !!v))).sort(), [transacties])

  const setA = filterTransacties(transacties, filterA)
  const reeksA = naarKwartaalReeks(setA)
  const samenA = samenvatting(setA)

  const setB = filterB ? filterTransacties(transacties, filterB) : []
  const reeksB = filterB ? naarKwartaalReeks(setB) : []
  const samenB = filterB ? samenvatting(setB) : null

  const prijsData = filterB ? combineerReeksen(reeksA, reeksB, 'gemiddeldeVerkoopprijs') : reeksA.map(p => ({ kwartaal: p.kwartaal, a: p.gemiddeldeVerkoopprijs }))
  const m2Data = filterB ? combineerReeksen(reeksA, reeksB, 'gemiddeldeM2Prijs') : reeksA.map(p => ({ kwartaal: p.kwartaal, a: p.gemiddeldeM2Prijs }))
  const looptijdData = filterB ? combineerReeksen(reeksA, reeksB, 'gemiddeldeLooptijd') : reeksA.map(p => ({ kwartaal: p.kwartaal, a: p.gemiddeldeLooptijd }))

  if (transacties.length === 0) {
    return (
      <div style={{ borderRadius: 'var(--merk-radius-card-lg, 18px)', border: '1px dashed #E1E5E9', background: '#FAFBFB', padding: '48px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13.5, color: '#98A0A6', maxWidth: 360, margin: '0 auto' }}>
          Nog geen transacties geïmporteerd — de grafieken vullen zich automatisch zodra de dataset binnen is.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'grid', gap: 10 }}>
        <FilterPaneel titel="Segment A" kleur={KLEUR_A} filter={filterA} onChange={setFilterA} types={types} wijken={wijken} />
        {filterB ? (
          <FilterPaneel titel="Segment B" kleur={KLEUR_B} filter={filterB} onChange={setFilterB} types={types} wijken={wijken} />
        ) : (
          <button type="button" onClick={() => setFilterB({})} style={{ alignSelf: 'flex-start', fontSize: 12.5, fontWeight: 600, color: 'var(--merk)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
            + Vergelijk met een tweede segment
          </button>
        )}
        {filterB && (
          <button type="button" onClick={() => setFilterB(null)} style={{ alignSelf: 'flex-start', fontSize: 12, color: '#98A0A6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Vergelijking uitzetten
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <StatKaart label="Transacties (A)" waarde={String(samenA.aantal)} />
        <StatKaart label="Gem. verkoopprijs (A)" waarde={samenA.gemiddeldeVerkoopprijs ? `€${samenA.gemiddeldeVerkoopprijs.toLocaleString('nl-NL')}` : '—'} />
        <StatKaart label="Gem. m²-prijs (A)" waarde={samenA.gemiddeldeM2Prijs ? `€${Math.round(samenA.gemiddeldeM2Prijs).toLocaleString('nl-NL')}` : '—'} />
        <StatKaart label="Gem. doorlooptijd (A)" waarde={samenA.gemiddeldeLooptijd ? `${Math.round(samenA.gemiddeldeLooptijd)} dagen` : '—'} />
        {samenB && (
          <>
            <StatKaart label="Transacties (B)" waarde={String(samenB.aantal)} />
            <StatKaart label="Gem. verkoopprijs (B)" waarde={samenB.gemiddeldeVerkoopprijs ? `€${samenB.gemiddeldeVerkoopprijs.toLocaleString('nl-NL')}` : '—'} />
          </>
        )}
      </div>

      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#14181B', margin: '0 0 10px' }}>Gemiddelde verkoopprijs per kwartaal</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={prijsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" />
            <XAxis dataKey="kwartaal" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => `€${Number(v).toLocaleString('nl-NL')}`} />
            {filterB && <Legend />}
            <Line type="monotone" dataKey="a" name="Segment A" stroke={KLEUR_A} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            {filterB && <Line type="monotone" dataKey="b" name="Segment B" stroke={KLEUR_B} strokeWidth={2} dot={{ r: 3 }} connectNulls />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#14181B', margin: '0 0 10px' }}>Gemiddelde m²-prijs per kwartaal</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={m2Data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" />
            <XAxis dataKey="kwartaal" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${v}`} />
            <Tooltip formatter={(v) => `€${Math.round(Number(v)).toLocaleString('nl-NL')}/m²`} />
            {filterB && <Legend />}
            <Line type="monotone" dataKey="a" name="Segment A" stroke={KLEUR_A} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            {filterB && <Line type="monotone" dataKey="b" name="Segment B" stroke={KLEUR_B} strokeWidth={2} dot={{ r: 3 }} connectNulls />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#14181B', margin: '0 0 10px' }}>Gemiddelde doorlooptijd (dagen) per kwartaal</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={looptijdData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" />
            <XAxis dataKey="kwartaal" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {filterB && <Legend />}
            <Bar dataKey="a" name="Segment A" fill={KLEUR_A} radius={[4, 4, 0, 0]} />
            {filterB && <Bar dataKey="b" name="Segment B" fill={KLEUR_B} radius={[4, 4, 0, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
