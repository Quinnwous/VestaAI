'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { colors, radius, shadow } from './tokens'

/**
 * Telt op van 0 naar `waarde` in ~400ms (ease-out), zie docs/ontwerpprincipes.md
 * § Beweging. Respecteert `prefers-reduced-motion` — toont dan meteen de
 * eindwaarde zonder te animeren. Geen aparte animatiebibliotheek nodig voor
 * één getal-tween; die komt er pas als een concreet item hem nodig heeft
 * (zie docs/ontwerpprincipes.md § Beweging — roadmap v2 kent geen losse
 * primitives-fase meer).
 */
function useGetalTween(waarde: number, duurMs = 400) {
  const [weergegeven, setWeergegeven] = useState(0)
  const vorigeWaarde = useRef(0)

  useEffect(() => {
    const verminderdeBeweging =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (verminderdeBeweging || duurMs <= 0) {
      setWeergegeven(waarde)
      vorigeWaarde.current = waarde
      return
    }

    const van = vorigeWaarde.current
    const naar = waarde
    if (van === naar) return

    let frame: number
    const start = performance.now()
    const tick = (nu: number) => {
      const t = Math.min(1, (nu - start) / duurMs)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setWeergegeven(Math.round(van + (naar - van) * eased))
      if (t < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        vorigeWaarde.current = naar
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [waarde, duurMs])

  return weergegeven
}

/** Mini-sparkline (SVG, geen library) onderin een hero/reeks-tegel — item 6.1. */
function Sparkline({ waarden, kleur }: { waarden: (number | null)[]; kleur: string }) {
  const v = waarden.filter((x): x is number => x != null)
  if (v.length < 2) return null
  const w = 100
  const h = 32
  const mn = Math.min(...v)
  const mx = Math.max(...v)
  const spreiding = mx - mn || 1
  const punten = waarden
    .map((x, i) => (x == null ? null : [(i / (waarden.length - 1)) * w, h - 3 - ((x - mn) / spreiding) * (h - 10)]))
    .filter((p): p is [number, number] => p != null)
  if (punten.length < 2) return null
  const d = punten.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const vlak = `${d} L${punten[punten.length - 1][0].toFixed(1)} ${h} L${punten[0][0].toFixed(1)} ${h} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: 32 }}>
      <path d={vlak} fill={kleur} opacity={0.1} />
      <path d={d} fill="none" stroke={kleur} strokeWidth={1.6} opacity={0.65} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/**
 * Kerncijfer-tegel: label + geanimeerd getal + optioneel bijschrift (bv. "n=12").
 * Toont bewust géén schijnzeker getal bij weinig data — geef in dat geval
 * `waarschuwing` mee i.p.v. `waarde` (zie docs/ontwerpprincipes.md § Data).
 *
 * Item 6.1 breidde de tegel uit met een optionele hero-variant (merkverloop,
 * zoals de eerste tegel in `docs/ontwerp/marktanalyse.html`), een delta t.o.v.
 * de vorige periode en een sparkline — allemaal optioneel, dus bestaand
 * gebruik (dashboard/Kerncijfers.tsx, WaardebepalingPaneel.tsx) blijft werken.
 */
export function StatTile({
  label,
  waarde,
  opmaak,
  bijschrift,
  waarschuwing,
  icoon,
  hero = false,
  delta,
  sparkline,
}: {
  label: ReactNode
  /** Numerieke waarde om te tonen/animeren. Weggelaten als er een waarschuwing is. */
  waarde?: number
  /** Formatteert het geanimeerde geheel getal, bv. (n) => `€ ${n.toLocaleString('nl-NL')}`. */
  opmaak?: (n: number) => string
  bijschrift?: ReactNode
  /** Getoond i.p.v. het getal wanneer er te weinig data is voor een betrouwbaar cijfer. */
  waarschuwing?: ReactNode
  icoon?: ReactNode
  /** Merkverloop-tegel (hero), zie docs/ontwerp/README.md § 1: één hero-moment per pagina. */
  hero?: boolean
  /** Delta t.o.v. de vorige periode — `tekst` is al opgemaakt (bv. "+3,2%"), `richting` stuurt de kleur. */
  delta?: { tekst: string; richting: 'op' | 'neer' | 'gelijk' | null }
  /** Reeks voor de mini-lijn onderin (bv. de laatste kwartalen); verborgen bij te weinig punten. */
  sparkline?: (number | null)[]
}) {
  const geanimeerd = useGetalTween(waarde ?? 0)

  return (
    <div
      style={{
        background: hero ? 'linear-gradient(135deg, #0A8AD2 0%, var(--merk-diep) 100%)' : colors.surface,
        border: hero ? 'none' : `1px solid ${colors.border}`,
        borderRadius: radius.cardLg,
        boxShadow: hero ? '0 2px 4px rgba(20,24,27,.06), 0 16px 36px -14px rgba(var(--merk-rgb, 26,107,69),.55)' : shadow.card,
        padding: '16px 18px',
        paddingBottom: sparkline ? 40 : 16,
        minWidth: 0,
        position: 'relative',
        overflow: 'hidden',
        color: hero ? '#fff' : undefined,
      }}
    >
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 650, color: hero ? 'rgba(255,255,255,.82)' : colors.muted, letterSpacing: '.01em' }}>{label}</span>
        {icoon}
      </div>
      {waarschuwing != null ? (
        <p style={{ position: 'relative', zIndex: 1, fontSize: 13, color: hero ? 'rgba(255,255,255,.85)' : colors.muted, margin: 0, lineHeight: 1.5 }}>{waarschuwing}</p>
      ) : (
        <>
          <div
            style={{
              position: 'relative', zIndex: 1,
              fontSize: 28,
              fontWeight: 800,
              color: hero ? '#fff' : colors.text,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-.02em',
              lineHeight: 1.1,
            }}
          >
            {opmaak ? opmaak(geanimeerd) : geanimeerd.toLocaleString('nl-NL')}
          </div>
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
            {delta ? (
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700,
                  padding: '3px 9px', borderRadius: radius.pill, fontVariantNumeric: 'tabular-nums',
                  background: hero
                    ? (delta.richting === 'op' ? 'rgba(255,255,255,.22)' : delta.richting === 'neer' ? 'rgba(198,30,69,.55)' : 'rgba(255,255,255,.16)')
                    : (delta.richting === 'op' ? colors.tint : delta.richting === 'neer' ? '#FEF3E2' : '#F1F3F5'),
                  color: hero ? '#fff' : (delta.richting === 'op' ? '#1B7F4C' : delta.richting === 'neer' ? '#B45309' : colors.bodyStrong),
                }}
              >
                {delta.richting === 'op' ? '▲' : delta.richting === 'neer' ? '▼' : '•'} {delta.tekst}
              </span>
            ) : bijschrift ? (
              <p style={{ fontSize: 12.5, color: hero ? 'rgba(255,255,255,.78)' : colors.muted, margin: 0 }}>{bijschrift}</p>
            ) : null}
            {bijschrift && delta && (
              <span style={{ fontSize: 12, color: hero ? 'rgba(255,255,255,.7)' : colors.muted }}>{bijschrift}</span>
            )}
          </div>
        </>
      )}
      {sparkline && waarschuwing == null && <Sparkline waarden={sparkline} kleur={hero ? '#fff' : 'var(--merk)'} />}
    </div>
  )
}
