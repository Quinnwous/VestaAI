'use client'

/**
 * recharts-trendgrafiek voor `ConcurrentieExplorer` (item P1, bundle-
 * splitsing — zie `docs/roadmap.md`). Dit is het énige bestand van de
 * concurrentie-explorer dat `recharts` importeert; `ConcurrentieExplorer.tsx`
 * laadt `TrendGrafiek` via `next/dynamic({ ssr: false })` zodat recharts niet
 * meer synchroon in de eerste lading van `/marktanalyse/concurrentie` zit.
 *
 * 1-op-1 verhuisd uit `ConcurrentieExplorer.tsx`, geen gedrag of opmaak
 * gewijzigd. `TrendSerie` is hier het exportpunt voor beide kanten — de
 * explorer importeert het type (`import type`), zodat er geen recharts wordt
 * meegetrokken.
 */

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip } from 'recharts'
import { colors, radius } from '@/components/ui/tokens'
import { procent } from '@/lib/opmaak'

export type TrendSerie = { key: string; naam: string; label: string; kleur: string; punten: { jaar: number; pct: number | null; n: number }[] }

const ONS = 'Eigen kantoor'

/** Zelfde nette foutmelding als `Onbeschikbaar` in `ConcurrentieExplorer.tsx` — hier gedupliceerd (klein, puur presentatie) om geen circulaire import tussen dit dynamic-geladen bestand en de explorer te introduceren. */
function Onbeschikbaar({ tekst }: { tekst: string }) {
  return (
    <p style={{ fontSize: 12.5, color: colors.muted, margin: '4px 0', fontStyle: 'italic' }}>{tekst}</p>
  )
}

export function TrendGrafiek({ series }: { series: TrendSerie[] }) {
  if (series.length === 0) return <Onbeschikbaar tekst="Onvoldoende data voor een trend." />
  const jaren = series[0].punten.map(p => p.jaar)
  const data = jaren.map((jaar, i) => {
    const rij: Record<string, number | string | null> = { jaar: String(jaar) }
    series.forEach(s => { rij[s.key] = s.punten[i]?.pct ?? null })
    return rij
  })
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,24,27,.06)" vertical={false} />
        <XAxis dataKey="jaar" tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={38} />
        <RTooltip content={<TrendTooltip series={series} />} />
        {series.map(s => (
          <Line
            key={s.key} type="monotone" dataKey={s.key} name={s.key} stroke={s.kleur}
            strokeWidth={s.naam === ONS ? 2.5 : 1.5} dot={s.naam === ONS ? { r: 3, fill: s.kleur, strokeWidth: 0 } : false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

function TrendTooltip({ active, payload, label, series }: { active?: boolean; payload?: { dataKey: string; value: number | null }[]; label?: string; series: TrendSerie[] }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(12px)', border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: '10px 12px', fontSize: 12, minWidth: 180 }}>
      <div style={{ fontWeight: 800, color: colors.text, marginBottom: 5 }}>{label}</div>
      {series.map(s => {
        const punt = payload.find(p => p.dataKey === s.key)
        if (!punt) return null
        return (
          <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '2px 0', color: colors.bodyStrong }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <i style={{ width: 8, height: 8, borderRadius: '50%', background: s.kleur, display: 'inline-block' }} />
              {s.naam}
            </span>
            <b style={{ fontVariantNumeric: 'tabular-nums' }}>{punt.value == null ? '—' : procent(punt.value, false)}</b>
          </div>
        )
      })}
    </div>
  )
}
