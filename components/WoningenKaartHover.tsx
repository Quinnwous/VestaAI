'use client'

/**
 * WoningenKaartHover — frosted infokaartje bij het hoveren over een
 * dossier-pin op `/woningen` (item 10.1), zelfde beeldtaal als
 * `components/kaart/HoverKaart.tsx` maar met dossiervelden (adres, fase)
 * i.p.v. transactievelden — die laatste zit in `components/kaart/` en is
 * eigendom van een andere agent (alleen lezen/importeren toegestaan).
 *
 * Gebruik: als sibling van <WoningenKaartLaag>, binnen dezelfde <BasisKaart>.
 */
import { useLayoutEffect, useRef, useState } from 'react'
import type { WoningHoverInfo } from './WoningenKaartLaag'

const FASE_LABEL: Record<string, string> = {
  verkoopadvies: 'Verkoopadvies',
  in_verkoop: 'In verkoop',
  verkocht: 'Verkocht',
}

export function WoningenKaartHover({ info }: { info: WoningHoverInfo | null }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [dx, setDx] = useState(0)
  const [dy, setDy] = useState(0)

  // Klemt de kaart binnen de kaartcontainer — zonder dit valt de hover-kaart
  // bij een pin dicht bij de rand half buiten beeld (zelfde patroon als
  // components/kaart/HoverKaart.tsx).
  useLayoutEffect(() => {
    if (!info || !ref.current?.parentElement) {
      setDx(0)
      setDy(0)
      return
    }
    const kaartRect = ref.current.parentElement.getBoundingClientRect()
    const eigenRect = ref.current.getBoundingClientRect()
    const marge = 8
    let nieuweDx = 0
    if (eigenRect.left < kaartRect.left + marge) nieuweDx = kaartRect.left + marge - eigenRect.left
    else if (eigenRect.right > kaartRect.right - marge) nieuweDx = kaartRect.right - marge - eigenRect.right
    const nieuweDy = eigenRect.top < kaartRect.top + marge ? kaartRect.top + marge - eigenRect.top : 0
    setDx(nieuweDx)
    setDy(nieuweDy)
  }, [info])

  if (!info) return null
  const { woning, x, y } = info

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: x,
        top: y - 14,
        transform: `translate(calc(-50% + ${dx}px), calc(-100% + ${dy}px))`,
        pointerEvents: 'none',
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.6)',
        borderRadius: 'var(--merk-radius-md, 12px)',
        boxShadow: '0 8px 24px rgba(20,24,27,.18)',
        padding: '10px 12px',
        minWidth: 170,
        maxWidth: 240,
        zIndex: 5,
      }}
    >
      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: '#232A2E' }}>{woning.address}</p>
      <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 700, color: 'var(--merk-diep)' }}>
        {FASE_LABEL[woning.fase] ?? woning.fase}
      </p>
    </div>
  )
}
