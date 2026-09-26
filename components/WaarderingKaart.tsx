'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BasisKaart, StraalLaag, ReferentiesLaag, type ReferentiePunt, type ReferentieHoverInfo } from '@/components/kaart'
import type { Coord } from '@/lib/kaart'
import type { WaarderingReferentie } from '@/lib/waardering'

function formatEuro(n: number): string {
  return `€ ${Math.round(n).toLocaleString('nl-NL')}`
}

function formatDatum(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Referentiekaart van het waardebepalingspaneel (item 4.6, docs/roadmap.md §
 * 3.3/3.8) — sinds item 7.3 op de MapLibre-stack (`components/kaart/`)
 * i.p.v. het vroegere Leaflet-patroon. Subject-marker in het midden,
 * straalcirkel, genummerde referentiepins (uitgesloten = gedimd), hover
 * toont adres/prijs/datum via een frosted tooltip. Referenties zonder
 * lat/lng (handmatig toegevoegd, § lib/transactiesQuery.ts
 * `haalTransactiesOpId`) staan niet op de kaart — de aanroeper
 * (`WaardebepalingPaneel.tsx`) filtert die er al uit vóór ze hier
 * binnenkomen, alleen in de tabel.
 */
export function WaarderingKaart({
  subject,
  straalM,
  referenties,
  uitgeslotenIds,
  hoogte = 440,
}: {
  subject: { lat: number; lng: number; adres: string }
  straalM: number | null
  referenties: (WaarderingReferentie & { lat: number; lng: number })[]
  uitgeslotenIds: Set<string>
  hoogte?: number | string
}) {
  const [hover, setHover] = useState<ReferentieHoverInfo | null>(null)

  const punten: ReferentiePunt[] = useMemo(
    () =>
      referenties.map((r, i) => ({
        id: r.id,
        lat: r.lat,
        lng: r.lng,
        volgnummer: i + 1,
        uitgesloten: uitgeslotenIds.has(r.id),
      })),
    [referenties, uitgeslotenIds],
  )

  const referentieById = useMemo(() => new Map(referenties.map((r) => [r.id, r])), [referenties])
  const nummerById = useMemo(() => new Map(punten.map((p) => [p.id, p.volgnummer])), [punten])

  // Kader op de straalcirkel (± 30% marge) i.p.v. op de referentiepunten
  // zelf: bij weinig/geclusterde referenties zou fitten-op-punten de
  // straalcirkel afsnijden. De straal loopt via de verbredingsladder (§ 3.3)
  // op van 750 m tot 5 km, een vaste zoom zou een brede selectie afsnijden.
  const bounds: [Coord, Coord] = useMemo(() => {
    const straal = straalM ?? 750
    const dLat = (straal * 1.3) / 111_320
    const dLng = dLat / (Math.cos((subject.lat * Math.PI) / 180) || 1)
    return [
      [subject.lng - dLng, subject.lat - dLat],
      [subject.lng + dLng, subject.lat + dLat],
    ]
  }, [subject.lat, subject.lng, straalM])

  const hoverReferentie = hover ? referentieById.get(hover.id) : null
  const hoverNummer = hover ? nummerById.get(hover.id) : undefined

  return (
    <BasisKaart bounds={bounds} hoogte={hoogte} scrollZoom={false}>
      {straalM && <StraalLaag center={[subject.lng, subject.lat]} straalM={straalM} />}
      <ReferentiesLaag
        subject={{ lat: subject.lat, lng: subject.lng, label: subject.adres }}
        referenties={punten}
        onHover={setHover}
      />
      {hover && hoverReferentie && (
        <ReferentieTooltip x={hover.x} y={hover.y} referentie={hoverReferentie} nummer={hoverNummer ?? 0} />
      )}
      <Legenda straalM={straalM} />
    </BasisKaart>
  )
}

/** Frosted tooltip op hover van een referentiepin — zelfde stijl als `HoverKaart` (verkoopkaart), aangepast aan `WaarderingReferentie`. */
function ReferentieTooltip({
  x,
  y,
  referentie,
  nummer,
}: {
  x: number
  y: number
  referentie: WaarderingReferentie
  nummer: number
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [dx, setDx] = useState(0)

  // Klemt de tooltip binnen de kaartcontainer, net als HoverKaart —
  // useLayoutEffect vóór de eerste paint, dus geen zichtbare sprong.
  useLayoutEffect(() => {
    if (!ref.current?.parentElement) {
      setDx(0)
      return
    }
    const kaartRect = ref.current.parentElement.getBoundingClientRect()
    const eigenRect = ref.current.getBoundingClientRect()
    const marge = 8
    let nieuweDx = 0
    if (eigenRect.left < kaartRect.left + marge) nieuweDx = kaartRect.left + marge - eigenRect.left
    else if (eigenRect.right > kaartRect.right - marge) nieuweDx = kaartRect.right - marge - eigenRect.right
    setDx(nieuweDx)
  }, [x, y])

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: x,
        top: y - 14,
        transform: `translate(calc(-50% + ${dx}px), -100%)`,
        pointerEvents: 'none',
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(20,24,27,.07)',
        borderRadius: 'var(--merk-radius-md, 12px)',
        boxShadow: '0 14px 44px -10px rgba(20,24,27,.24), 0 2px 8px rgba(20,24,27,.06)',
        padding: '11px 13px',
        minWidth: 210,
        maxWidth: 250,
        zIndex: 5,
        fontSize: 12,
      }}
    >
      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#14181B' }}>
        #{nummer} · {referentie.adres}
        {referentie.handmatig ? ' · handmatig' : ''}
      </p>
      <p style={{ margin: '4px 0 0', color: '#5C6470' }}>
        {formatDatum(referentie.verkoopdatum)} · {referentie.m2} m²
      </p>
      <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 800, color: 'var(--merk-diep, var(--merk))', fontVariantNumeric: 'tabular-nums' }}>
        {formatEuro(referentie.prijs)}
      </p>
    </div>
  )
}

/** Legenda-pil linksonder — dezelfde SVG's als `SubjectPin`/`ReferentiePin`, verkleind voor gebruik als icoon. */
function Legenda({ straalM }: { straalM: number | null }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 10,
        bottom: 10,
        zIndex: 5,
        background: 'rgba(255,255,255,.9)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(20,24,27,.07)',
        borderRadius: 'var(--merk-radius-pill, 9999px)',
        padding: '6px 13px 6px 9px',
        fontSize: 11,
        fontWeight: 600,
        color: '#2C3238',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        boxShadow: '0 1px 2px rgba(20,24,27,.04)',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <svg width={14} height={17} viewBox="0 0 26 32">
          <circle cx={13} cy={13} r={15} fill="var(--merk)" opacity={0.22} />
          <path d="M13 2.5 23.5 13 13 23.5 2.5 13Z" fill="none" stroke="var(--merk-accent)" strokeWidth={2.6} />
          <path d="M13 6.5 19.5 13 13 19.5 6.5 13Z" fill="var(--merk)" />
        </svg>
        dit adres
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <svg width={12} height={15} viewBox="0 0 24 30">
          <path
            d="M12 1.5C6.7 1.5 2.3 5.8 2.3 11c0 7.3 9.7 16.6 9.7 16.6S21.7 18.3 21.7 11c0-5.2-4.4-9.5-9.7-9.5z"
            fill="var(--merk)"
            stroke="#fff"
            strokeWidth={1.6}
          />
        </svg>
        referentie
      </span>
      {straalM && <span>cirkel = straal {straalM >= 1000 ? `${straalM / 1000} km` : `${straalM} m`}</span>}
    </div>
  )
}
