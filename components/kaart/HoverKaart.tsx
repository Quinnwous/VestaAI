'use client'

/**
 * HoverKaart — frosted infokaart die verschijnt bij het hoveren over een pin
 * (docs/ontwerp/README.md § 6): adres · prijs · datum · m², opmaak via
 * `Intl` (nl-NL). Wordt aangestuurd door `VerkopenLaag`'s `onHover`.
 *
 * Gebruik: als sibling van <VerkopenLaag>, binnen dezelfde <BasisKaart> (de
 * pixelpositie x/y is relatief aan de kaartcontainer):
 *   const [hover, setHover] = useState<VerkoopHoverInfo | null>(null)
 *   <BasisKaart>
 *     <VerkopenLaag transacties={t} onHover={setHover} />
 *     <HoverKaart info={hover} />
 *   </BasisKaart>
 */
import { useLayoutEffect, useRef, useState } from 'react'
import type { VerkoopHoverInfo } from './VerkopenLaag'

const euroOpmaak = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const datumOpmaak = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
const m2Opmaak = new Intl.NumberFormat('nl-NL')

function formatEuro(bedrag: number | null): string {
  return bedrag === null ? '—' : euroOpmaak.format(bedrag)
}

function formatDatum(iso: string | null): string {
  return iso ? datumOpmaak.format(new Date(iso)) : '—'
}

export function HoverKaart({ info }: { info: VerkoopHoverInfo | null }) {
  const ref = useRef<HTMLDivElement | null>(null)
  // Klemt de kaart binnen de kaartcontainer — zonder dit valt de hover-kaart
  // bij een pin dicht bij de rand (vooral op 390 px) half buiten beeld.
  // useLayoutEffect vóór de eerste paint, dus geen zichtbare sprong.
  const [dx, setDx] = useState(0)
  const [dy, setDy] = useState(0)

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
  const { transactie, x, y } = info

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
      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: '#232A2E' }}>{transactie.adres}</p>
      <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--merk)' }}>
        {formatEuro(transactie.verkoopprijs)}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#7A828A' }}>
        {formatDatum(transactie.verkoopdatum)}
        {transactie.woonoppervlak_m2 ? ` · ${m2Opmaak.format(transactie.woonoppervlak_m2)} m²` : ''}
      </p>
    </div>
  )
}
