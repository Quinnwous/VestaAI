'use client'

/**
 * recharts-grafieken voor `MarktanalyseExplorer` (item P1, bundle-splitsing —
 * zie `docs/roadmap.md`). Dit is het énige bestand van de marktanalyse dat
 * `recharts` importeert; `MarktanalyseExplorer.tsx` laadt `LijnGrafiek` en
 * `LooptijdGrafiek` via `next/dynamic({ ssr: false })` zodat recharts (met
 * redux-toolkit/immer/decimal.js, ~116 kB gzip) niet meer synchroon in de
 * eerste lading van `/marktanalyse` zit — tijdens SSR rendert
 * `ResponsiveContainer` toch niets zichtbaars.
 *
 * 1-op-1 verhuisd uit `MarktanalyseExplorer.tsx`, geen gedrag of opmaak
 * gewijzigd.
 */

import {
  ResponsiveContainer, ComposedChart, Area, Line, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
} from 'recharts'
import { colors } from '@/components/ui/tokens'
import { dagen } from '@/lib/opmaak'
import { SERIE, SERIE_LABEL, TOOLTIP_STYLE } from '@/lib/grafiekThema'

type GrafiekRij = {
  kwartaal: string
  label: string
  markt: number | null
  wij: number | null
  b: number | null
  nMarkt: number
  nWij: number
  nB: number
}

function GrafiekTooltip({ actief, payload, label, fmt }: { actief?: boolean; payload?: { dataKey: string; value: number | null; payload: Record<string, number> }[]; label?: string; fmt: (v: number) => string }) {
  if (!actief || !payload?.length) return null
  const rij = payload[0]?.payload
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 800, color: colors.text, marginBottom: 5 }}>{label}</div>
      {(['markt', 'wij', 'b'] as const).map(key => {
        const punt = payload.find(p => p.dataKey === key)
        if (!punt || punt.value == null) return null
        return (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '2px 0', color: colors.bodyStrong }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <i style={{ width: 8, height: 8, borderRadius: '50%', background: SERIE[key], display: 'inline-block' }} />
              {SERIE_LABEL[key]}
            </span>
            <b style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(punt.value)}</b>
          </div>
        )
      })}
      {rij && (
        <div style={{ color: colors.muted, marginTop: 4, borderTop: `1px solid ${colors.border}`, paddingTop: 4 }}>
          n: markt {rij.nMarkt}{rij.nWij ? ` · wij ${rij.nWij}` : ''}{rij.nB ? ` · B ${rij.nB}` : ''}
        </div>
      )}
    </div>
  )
}

function LegeGrafiek() {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.muted, fontSize: 13 }}>
      Nog te weinig data voor deze grafiek.
    </div>
  )
}

// ── Lijngrafiek (prijs/m²) — recharts, thema uit lib/grafiekThema.ts ──
export function LijnGrafiek({
  data,
  yFmt,
  ttFmt,
  segmentB,
}: {
  data: GrafiekRij[]
  yFmt: (v: number) => string
  ttFmt: (v: number) => string
  segmentB: boolean
}) {
  const alleWaarden = data.flatMap(d => [d.markt, d.wij, d.b]).filter((v): v is number => v != null)
  if (!alleWaarden.length) return <LegeGrafiek />
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="vlak-wij" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={SERIE.wij} stopOpacity={0.26} />
            <stop offset="1" stopColor={SERIE.wij} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,24,27,.06)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: colors.muted }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: colors.muted }}
          tickLine={false}
          axisLine={false}
          tickFormatter={yFmt}
          // Genoeg breedte voor "€ 1,2 mln" op één regel (fix review item 6.1,
          // 24 sep 2026: brak eerder af over twee regels bij width={56}).
          width={68}
          tickCount={5}
          allowDecimals={false}
          domain={['dataMin', 'dataMax']}
        />
        <RTooltip content={<GrafiekTooltip fmt={ttFmt} />} />
        <Line type="monotone" dataKey="markt" stroke={SERIE.markt} strokeWidth={1.5} dot={false} connectNulls name="markt" />
        {segmentB && <Line type="monotone" dataKey="b" stroke={SERIE.b} strokeWidth={2} dot={false} connectNulls name="b" />}
        <Area type="monotone" dataKey="wij" stroke="none" fill="url(#vlak-wij)" connectNulls name="wij-vlak" legendType="none" />
        <Line type="monotone" dataKey="wij" stroke={SERIE.wij} strokeWidth={2.5} dot={{ r: 3, fill: SERIE.wij, strokeWidth: 0 }} connectNulls name="wij" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ── Looptijd: staven (markt) + lijnen (wij/B) ──
export function LooptijdGrafiek({
  data,
  segmentB,
}: {
  data: GrafiekRij[]
  segmentB: boolean
}) {
  const alleWaarden = data.flatMap(d => [d.markt, d.wij, d.b]).filter((v): v is number => v != null)
  if (!alleWaarden.length) return <LegeGrafiek />
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,24,27,.06)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: colors.muted }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: colors.muted }} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
        <RTooltip content={<GrafiekTooltip fmt={v => dagen(v)} />} />
        <Bar dataKey="markt" fill={SERIE.markt} fillOpacity={0.22} radius={[6, 6, 0, 0]} name="markt" />
        <Line type="monotone" dataKey="wij" stroke={SERIE.wij} strokeWidth={2.5} dot={{ r: 3, fill: SERIE.wij, strokeWidth: 0 }} connectNulls name="wij" />
        {segmentB && <Line type="monotone" dataKey="b" stroke={SERIE.b} strokeWidth={2} dot={false} connectNulls name="b" />}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
