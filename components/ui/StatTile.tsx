'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { colors, radius, shadow } from './tokens'

/**
 * Telt op van 0 naar `waarde` in ~400ms (ease-out), zie docs/ontwerpprincipes.md
 * § Beweging. Respecteert `prefers-reduced-motion` — toont dan meteen de
 * eindwaarde zonder te animeren. Geen aparte animatiebibliotheek nodig voor
 * één getal-tween; `motion` (fase 2.2) is voor paginaovergangen en panelen.
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

/**
 * Kerncijfer-tegel: label + geanimeerd getal + optioneel bijschrift (bv. "n=12").
 * Toont bewust géén schijnzeker getal bij weinig data — geef in dat geval
 * `waarschuwing` mee i.p.v. `waarde` (zie docs/ontwerpprincipes.md § Data).
 */
export function StatTile({
  label,
  waarde,
  opmaak,
  bijschrift,
  waarschuwing,
  icoon,
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
}) {
  const geanimeerd = useGetalTween(waarde ?? 0)

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.cardLg,
        boxShadow: shadow.card,
        padding: 20,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, fontWeight: 650, color: colors.muted, letterSpacing: '.01em' }}>{label}</span>
        {icoon}
      </div>
      {waarschuwing != null ? (
        <p style={{ fontSize: 13, color: colors.muted, margin: 0, lineHeight: 1.5 }}>{waarschuwing}</p>
      ) : (
        <>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: colors.text,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-.02em',
              lineHeight: 1.1,
            }}
          >
            {opmaak ? opmaak(geanimeerd) : geanimeerd.toLocaleString('nl-NL')}
          </div>
          {bijschrift && (
            <p style={{ fontSize: 12.5, color: colors.muted, margin: '4px 0 0' }}>{bijschrift}</p>
          )}
        </>
      )}
    </div>
  )
}
