'use client'

/**
 * DumbbellStat — twee-punts vergelijking ("wij" vs. "markt") op één lijn,
 * poort van `docs/ontwerp/concurrentie.html` `bouwDumbbell()` (item 6.3).
 * Gebruik:
 *   <DumbbellStat wij={looptijdWij} markt={looptijdMarkt} fmt={dagen} gunstig={-1}
 *     deltaFmt={dl => `${dl > 0 ? '+' : ''}${Math.round(dl)} dgn t.o.v. de markt`} />
 * `gunstig`: 1 = hoger is beter, -1 = lager is beter, 0 = neutraal (geen
 * semantische kleur — bv. €/m² is geen "goed"/"fout", alleen een verschil).
 */

import { colors } from './tokens'

const GOED = '#1B7F4C'
const AANDACHT = '#B45309'

export function DumbbellStat({
  wij,
  markt,
  fmt,
  gunstig,
  deltaFmt,
}: {
  wij: number | null
  markt: number | null
  fmt: (v: number) => string
  gunstig: 1 | -1 | 0
  deltaFmt: (delta: number) => string
}) {
  if (wij == null || markt == null) {
    return <p style={{ fontSize: 12.5, color: colors.muted, margin: '6px 0 0' }}>Onvoldoende data.</p>
  }

  const lo = Math.min(wij, markt)
  const hi = Math.max(wij, markt)
  const pad = Math.max((hi - lo) * 0.45, Math.abs(hi) * 0.08, 1)
  let dmin = lo - pad
  const dmax = hi + pad
  if (dmin < 0 && lo >= 0) dmin = 0
  const pct = (v: number) => ((v - dmin) / (dmax - dmin || 1)) * 100
  const pWij = pct(wij)
  const pMarkt = pct(markt)
  const delta = wij - markt
  const richting = delta > 0 ? 1 : delta < 0 ? -1 : 0
  const kleur = gunstig === 0 || richting === 0 ? colors.bodyStrong : richting === gunstig ? GOED : AANDACHT
  // Labels zouden elkaar overlappen: het marktlabel dan hoger plaatsen.
  const botsing = Math.abs(pWij - pMarkt) < 16

  return (
    <div>
      <div style={{ position: 'relative', height: 42, margin: '10px 8px 0' }}>
        <div
          style={{
            position: 'absolute', top: 33, height: 2, background: colors.borderStrong,
            left: `${Math.min(pWij, pMarkt)}%`, width: `${Math.abs(pWij - pMarkt)}%`,
          }}
        />
        <div
          style={{
            position: 'absolute', top: 25, width: 16, height: 16, borderRadius: '50%', transform: 'translateX(-50%)',
            left: `${pMarkt}%`, background: colors.surface, border: `2px solid ${colors.bodyStrong}`, boxSizing: 'border-box',
          }}
          title="Markt"
        />
        <div
          style={{
            position: 'absolute', top: 25, width: 16, height: 16, borderRadius: '50%', transform: 'translateX(-50%)',
            left: `${pWij}%`, background: 'var(--merk)', boxShadow: '0 0 0 3px var(--merk-zacht)',
          }}
          title="Wij"
        />
        <div
          style={{
            position: 'absolute', top: botsing ? -9 : 9, transform: 'translateX(-50%)', fontSize: 11, fontWeight: 800,
            whiteSpace: 'nowrap', left: `${pMarkt}%`, color: colors.bodyStrong,
          }}
        >
          {fmt(markt)}
        </div>
        <div
          style={{
            position: 'absolute', top: 9, transform: 'translateX(-50%)', fontSize: 11, fontWeight: 800,
            whiteSpace: 'nowrap', left: `${pWij}%`, color: 'var(--merk-diep)',
          }}
        >
          {fmt(wij)}
        </div>
      </div>
      <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 700, color: kleur, fontVariantNumeric: 'tabular-nums' }}>
        {richting > 0 ? '▲' : richting < 0 ? '▼' : '•'} {deltaFmt(delta)}
      </div>
    </div>
  )
}
