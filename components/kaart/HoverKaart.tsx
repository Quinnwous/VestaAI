'use client'

/**
 * HoverKaart — frosted infokaart die verschijnt bij het hoveren over een pin
 * (docs/ontwerp/README.md § 6 en `docs/ontwerp/verkoopkaart.html`
 * `.kaartkaart`): adres · plaats/wijk · prijs · subtype · m² · bouwjaar ·
 * energielabel · verkocht op · looptijd · boven/onder vraagprijs. Geen
 * makelaar-regel (het prototype toont die wel, uit synthetische teamdata) —
 * `transacties` heeft geen makelaar-kolom, zie `lib/verkoopkaart.ts`
 * bovenaan. Opmaak via `lib/opmaak.ts` (nl-NL, net als élke andere verkenner).
 * Wordt aangestuurd door `VerkopenLaag`'s `onHover`.
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
import { euro, datum, m2, dagen } from '@/lib/opmaak'

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
  const t = info.transactie
  const { x, y } = info

  const bovenVraagprijs = t.verkoopprijs != null && t.vraagprijs != null ? t.verkoopprijs > t.vraagprijs : null
  const metaEen = [t.woningtype_sub, t.woonoppervlak_m2 ? m2(t.woonoppervlak_m2) : null, t.bouwjaar ? String(t.bouwjaar) : null, t.energielabel ? `label ${t.energielabel}` : null].filter(Boolean)
  const metaTwee = [t.verkoopdatum ? `Verkocht ${datum(t.verkoopdatum)}` : null, t.looptijd_dagen != null ? dagen(t.looptijd_dagen) : null, bovenVraagprijs == null ? null : bovenVraagprijs ? 'boven vraagprijs' : 'onder vraagprijs'].filter(Boolean)

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: x,
        top: y - 14,
        transform: `translate(calc(-50% + ${dx}px), calc(-100% + ${dy}px))`,
        pointerEvents: 'none',
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(20,24,27,.07)',
        borderRadius: 'var(--merk-radius-md, 12px)',
        boxShadow: '0 14px 44px -10px rgba(20,24,27,.24), 0 2px 8px rgba(20,24,27,.06)',
        padding: '11px 13px',
        minWidth: 220,
        maxWidth: 260,
        zIndex: 5,
        fontSize: 12,
      }}
    >
      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: '#14181B' }}>{t.adres}</p>
      {(t.plaats || t.wijk) && (
        <p style={{ margin: '2px 0 6px', color: '#5C6470' }}>{[t.plaats, t.wijk].filter(Boolean).join(' · ')}</p>
      )}
      <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--merk-diep, var(--merk))', fontVariantNumeric: 'tabular-nums' }}>
        {euro(t.verkoopprijs)}
      </p>
      {metaEen.length > 0 && (
        <div style={{ display: 'flex', gap: 10, color: '#98A0A6', marginTop: 4, flexWrap: 'wrap', fontVariantNumeric: 'tabular-nums' }}>
          {metaEen.map((m, i) => <span key={i} style={{ color: '#2C3238', fontWeight: 700 }}>{m}</span>)}
        </div>
      )}
      {metaTwee.length > 0 && (
        <div style={{ display: 'flex', gap: 10, color: '#98A0A6', marginTop: 4, flexWrap: 'wrap', fontVariantNumeric: 'tabular-nums' }}>
          {metaTwee.map((m, i) => <span key={i}>{m}</span>)}
        </div>
      )}
    </div>
  )
}
