'use client'

import { useMemo, useState } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import {
  heeftConcurrentiedata, marktaandeel, wieWintWelkSegment,
  presterenWijBeter, concurrentProfielen,
} from '@/lib/concurrentie'
import type { TransactieRow } from '@/lib/supabase'

const KLEUREN = ['var(--merk)', '#D97706', '#5C6470', '#8B5CF6', '#DC2626', '#0EA5E9', '#84CC16']

function StatKaart({ label, waarde, sub }: { label: string; waarde: string; sub?: string }) {
  return (
    <div style={{ borderRadius: 'var(--merk-radius-lg, 14px)', border: '1px solid #E6E9EC', background: '#fff', padding: '14px 16px' }}>
      <p style={{ fontSize: 20, fontWeight: 700, color: '#14181B', margin: 0 }}>{waarde}</p>
      <p style={{ fontSize: 12, color: '#98A0A6', margin: '2px 0 0' }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: '#98A0A6', margin: '2px 0 0' }}>{sub}</p>}
    </div>
  )
}

/**
 * Concurrentieanalyse-explorer (F6, besluit 16 sep 2026 — "uitgebreid": alle
 * vier onderdelen, interactief). Draait op `verkopend_kantoor` in de
 * transactiedataset; zonder dat veld (alleen eigen verkopen bekend) toont dit
 * scherm een eerlijke lege staat in plaats van misleidende cijfers.
 */
export function ConcurrentieExplorer({ transacties }: { transacties: TransactieRow[] }) {
  const [periodeMaanden, setPeriodeMaanden] = useState(0)

  const gefilterd = useMemo(() => {
    if (periodeMaanden === 0) return transacties
    const grens = Date.now() - periodeMaanden * 30 * 24 * 60 * 60 * 1000
    return transacties.filter(t => t.verkoopdatum && new Date(t.verkoopdatum).getTime() >= grens)
  }, [transacties, periodeMaanden])

  if (transacties.length === 0) {
    return (
      <div style={{ borderRadius: 'var(--merk-radius-card-lg, 18px)', border: '1px dashed #E1E5E9', background: '#FAFBFB', padding: '48px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13.5, color: '#98A0A6', maxWidth: 380, margin: '0 auto' }}>
          Nog geen transacties geïmporteerd — dit scherm vult zich zodra de dataset binnen is.
        </p>
      </div>
    )
  }

  if (!heeftConcurrentiedata(gefilterd)) {
    return (
      <div style={{ borderRadius: 'var(--merk-radius-card-lg, 18px)', border: '1px dashed #E1E5E9', background: '#FAFBFB', padding: '48px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13.5, color: '#98A0A6', maxWidth: 420, margin: '0 auto' }}>
          De huidige dataset bevat alleen eigen verkopen, geen concurrentiegegevens (kolom &ldquo;verkopend kantoor&rdquo;).
          Dit scherm wordt bruikbaar zodra dat veld gevuld is — via de Realworks-export of een Brainbay-import.
        </p>
      </div>
    )
  }

  const aandeel = marktaandeel(gefilterd)
  const segmenten = wieWintWelkSegment(gefilterd)
  const prestatie = presterenWijBeter(gefilterd)
  const profielen = concurrentProfielen(gefilterd)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 28 }}>
      <div style={{ display: 'inline-flex', borderRadius: 10, overflow: 'hidden', border: '1px solid #E1E5E9', alignSelf: 'flex-start' }}>
        {[{ l: 'Alles', m: 0 }, { l: '12 mnd', m: 12 }, { l: '24 mnd', m: 24 }].map(p => (
          <button key={p.l} type="button" onClick={() => setPeriodeMaanden(p.m)} style={{ padding: '7px 13px', fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer', background: periodeMaanden === p.m ? 'var(--merk)' : '#fff', color: periodeMaanden === p.m ? '#fff' : '#5C6470' }}>
            {p.l}
          </button>
        ))}
      </div>

      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#14181B', margin: '0 0 12px' }}>Marktaandeel</p>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <ResponsiveContainer width={220} height={220}>
            <PieChart>
              <Pie data={aandeel} dataKey="aantal" nameKey="kantoor" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {aandeel.map((entry, i) => <Cell key={entry.kantoor} fill={KLEUREN[i % KLEUREN.length]} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} transacties`, String(n)]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'grid', gap: 6 }}>
            {aandeel.map((a, i) => (
              <div key={a.kantoor} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: KLEUREN[i % KLEUREN.length], flexShrink: 0 }} />
                <span style={{ color: a.kantoor === 'Eigen kantoor' ? 'var(--merk)' : '#14181B', fontWeight: a.kantoor === 'Eigen kantoor' ? 700 : 500 }}>{a.kantoor}</span>
                <span style={{ color: '#98A0A6' }}>{a.aandeelPct}% ({a.aantal})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#14181B', margin: '0 0 12px' }}>Presteren wij beter?</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <StatKaart label="Eigen doorlooptijd" waarde={prestatie.eigenGemLooptijd !== null ? `${prestatie.eigenGemLooptijd} dagen` : '—'} />
          <StatKaart label="Regio-doorlooptijd" waarde={prestatie.regioGemLooptijd !== null ? `${prestatie.regioGemLooptijd} dagen` : '—'} />
          <StatKaart label="Eigen prijsverschil" waarde={prestatie.eigenGemPrijsverschilPct !== null ? `${prestatie.eigenGemPrijsverschilPct}%` : '—'} sub="verkoop t.o.v. vraagprijs" />
          <StatKaart label="Regio-prijsverschil" waarde={prestatie.regioGemPrijsverschilPct !== null ? `${prestatie.regioGemPrijsverschilPct}%` : '—'} sub="verkoop t.o.v. vraagprijs" />
        </div>
      </div>

      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#14181B', margin: '0 0 12px' }}>Wie wint welk segment</p>
        <div style={{ borderRadius: 'var(--merk-radius-card-lg, 18px)', border: '1px solid #E6E9EC', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#FAFBFB', borderBottom: '1px solid #E6E9EC' }}>
                <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11.5, color: '#98A0A6', fontWeight: 700 }}>Segment</th>
                <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11.5, color: '#98A0A6', fontWeight: 700 }}>Winnaar</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 11.5, color: '#98A0A6', fontWeight: 700 }}>Transacties</th>
              </tr>
            </thead>
            <tbody>
              {segmenten.map(s => (
                <tr key={s.segment} style={{ borderBottom: '1px solid #F1F3F5' }}>
                  <td style={{ padding: '9px 12px', color: '#14181B', fontWeight: 600 }}>{s.segment}</td>
                  <td style={{ padding: '9px 12px', color: s.winnaar === 'Eigen kantoor' ? 'var(--merk)' : '#5C6470', fontWeight: s.winnaar === 'Eigen kantoor' ? 700 : 500 }}>{s.winnaar}</td>
                  <td style={{ padding: '9px 12px', color: '#5C6470', textAlign: 'right' }}>{s.aantal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#14181B', margin: '0 0 12px' }}>Concurrent-profielen</p>
        <div style={{ borderRadius: 'var(--merk-radius-card-lg, 18px)', border: '1px solid #E6E9EC', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#FAFBFB', borderBottom: '1px solid #E6E9EC' }}>
                <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11.5, color: '#98A0A6', fontWeight: 700 }}>Kantoor</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 11.5, color: '#98A0A6', fontWeight: 700 }}>Transacties</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 11.5, color: '#98A0A6', fontWeight: 700 }}>Gem. prijs</th>
                <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11.5, color: '#98A0A6', fontWeight: 700 }}>Sterkste segment</th>
              </tr>
            </thead>
            <tbody>
              {profielen.map(p => (
                <tr key={p.kantoor} style={{ borderBottom: '1px solid #F1F3F5' }}>
                  <td style={{ padding: '9px 12px', color: p.kantoor === 'Eigen kantoor' ? 'var(--merk)' : '#14181B', fontWeight: 700 }}>{p.kantoor}</td>
                  <td style={{ padding: '9px 12px', color: '#5C6470', textAlign: 'right' }}>{p.aantal}</td>
                  <td style={{ padding: '9px 12px', color: '#5C6470', textAlign: 'right' }}>{p.gemiddeldePrijs ? `€${Math.round(p.gemiddeldePrijs).toLocaleString('nl-NL')}` : '—'}</td>
                  <td style={{ padding: '9px 12px', color: '#5C6470' }}>{p.topSegment ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
