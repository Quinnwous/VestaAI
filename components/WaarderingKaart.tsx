'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  BasisKaart,
  StraalLaag,
  ReferentiesLaag,
  VerkopenLaag,
  HoverKaart,
  KaderLaag,
  type ReferentiePunt,
  type ReferentieHoverInfo,
  type VerkoopHoverInfo,
} from '@/components/kaart'
import { filterBinnenStraal } from '@/lib/straalFilter'
import { bepaalDossierKaartBounds, straalLabel, type DossierKaartLaag } from '@/lib/dossierKaart'
import type { WaarderingReferentie } from '@/lib/waardering'
import type { TransactieMetCoordinaten } from '@/lib/supabase'

function formatEuro(n: number): string {
  return `€ ${Math.round(n).toLocaleString('nl-NL')}`
}

function formatDatum(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Dossierkaart (item "Twee kaarten in het dossier samenvoegen",
 * docs/roadmap.md § 9) — de vroegere referentiekaart van de waardering
 * (item 4.6, docs/roadmap.md § 3.3/3.8) en de straal-uitsnede "In de buurt
 * verkocht" (item 7.3, ex-`StraalKaartPaneel`) zijn hier samengevoegd tot
 * één `<BasisKaart>` met een laagschakelaar: subject-pin altijd zichtbaar,
 * daarnaast óf de genummerde waarderingsreferenties óf de eigen-verkoop-
 * pins binnen een zelf te kiezen straal (250/500/1000 m). Beide lagen delen
 * dezelfde straalcirkel-stijl (`StraalLaag`) en herkaderen bij wisselen via
 * `KaderLaag` (`BasisKaart`'s eigen `bounds`-prop zet het kader alleen bij
 * de eerste mount). De laag-/straalkeuze zelf is state van de aanroeper
 * (`WaardebepalingPaneel.tsx`, dat ook de eigen-verkopen-lijst en de
 * standaardlaag bepaalt via `lib/dossierKaart.ts`) — dit component is puur
 * weergave op basis van props, net als de losse lagen in `components/kaart/`.
 */
export function WaarderingKaart({
  subject,
  straalM,
  referenties,
  uitgeslotenIds,
  eigenVerkopen,
  laag,
  verkoopStraal,
  hoogte = 440,
}: {
  subject: { lat: number; lng: number; adres: string }
  /** Straal van de waarderingsreferenties (uitkomst.straal_m) — null bij methode "plaats". */
  straalM: number | null
  referenties: (WaarderingReferentie & { lat: number; lng: number })[]
  uitgeslotenIds: Set<string>
  /** Alle eigen verkopen van het kantoor mét coördinaten — deze kaart filtert zelf op straal. */
  eigenVerkopen: TransactieMetCoordinaten[]
  laag: DossierKaartLaag
  /** Straal voor de laag "Eigen verkopen" (250/500/1000 m) — de pil-schakelaar
   * hiervoor leeft in WaardebepalingPaneel.tsx (kaartkop), niet op de kaart
   * zelf: dat zou MapLibre's eigen zoomknoppen rechtsboven overlappen. */
  verkoopStraal: number
  hoogte?: number | string
}) {
  const [refHover, setRefHover] = useState<ReferentieHoverInfo | null>(null)
  const [verkoopHover, setVerkoopHover] = useState<VerkoopHoverInfo | null>(null)

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

  const binnenStraal = useMemo(
    () => filterBinnenStraal(eigenVerkopen, [subject.lat, subject.lng], verkoopStraal),
    [eigenVerkopen, subject.lat, subject.lng, verkoopStraal],
  )

  // Kader op de straalcirkel (± 30% marge, zie lib/geo.ts kaderRondStraal)
  // i.p.v. op de punten zelf: bij weinig/geclusterde data zou fitten-op-
  // punten de cirkel afsnijden.
  const bounds = useMemo(
    () => bepaalDossierKaartBounds(subject, laag, straalM, verkoopStraal),
    [subject, laag, straalM, verkoopStraal],
  )

  const hoverReferentie = refHover ? referentieById.get(refHover.id) : null
  const hoverNummer = refHover ? nummerById.get(refHover.id) : undefined

  return (
    <div style={{ position: 'relative' }}>
      <BasisKaart bounds={bounds} hoogte={hoogte} scrollZoom={false}>
        <KaderLaag bounds={bounds} />
        <StraalLaag center={[subject.lng, subject.lat]} straalM={laag === 'verkopen' ? verkoopStraal : (straalM ?? 750)} />

        {laag === 'referenties' ? (
          <>
            <ReferentiesLaag
              subject={{ lat: subject.lat, lng: subject.lng, label: subject.adres }}
              referenties={punten}
              onHover={setRefHover}
            />
            {refHover && hoverReferentie && (
              <ReferentieTooltip x={refHover.x} y={refHover.y} referentie={hoverReferentie} nummer={hoverNummer ?? 0} />
            )}
          </>
        ) : (
          <>
            {/* Lege referentielijst houdt het subject-pin zonder genummerde pins. */}
            <ReferentiesLaag
              subject={{ lat: subject.lat, lng: subject.lng, label: subject.adres }}
              referenties={[]}
            />
            <VerkopenLaag transacties={binnenStraal} onHover={setVerkoopHover} />
            <HoverKaart info={verkoopHover} />
          </>
        )}

        <Legenda laag={laag} straalM={laag === 'verkopen' ? verkoopStraal : straalM} />
      </BasisKaart>

      {laag === 'verkopen' && binnenStraal.length === 0 && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 4, display: 'grid', placeItems: 'center',
            background: 'rgba(247,248,249,.72)', borderRadius: 'var(--merk-radius-card-lg, 18px)', pointerEvents: 'none',
          }}
        >
          <p
            style={{
              background: '#fff', border: '1px dashed rgba(20,24,27,.18)', borderRadius: 'var(--merk-radius-md, 12px)',
              padding: '10px 16px', fontSize: 12.5, color: '#3A4046', margin: 0, textAlign: 'center', maxWidth: 260,
            }}
          >
            Nog geen eigen verkopen binnen deze straal — kies een grotere straal of wacht op meer data.
          </p>
        </div>
      )}
    </div>
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

/** Legenda-pil linksonder — dezelfde SVG's als `SubjectPin`/`ReferentiePin`/`Pin`, verkleind voor gebruik als icoon. */
function Legenda({ laag, straalM }: { laag: DossierKaartLaag; straalM: number | null }) {
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
      {laag === 'referenties' ? (
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
      ) : (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <svg width={13} height={16} viewBox="0 0 26 32">
            <path d="M13 2.5 23.5 13 13 23.5 2.5 13Z" fill="none" stroke="var(--merk-accent)" strokeWidth={2} />
            <path d="M13 6.5 19.5 13 13 19.5 6.5 13Z" fill="var(--merk)" />
          </svg>
          eigen verkoop
        </span>
      )}
      {straalM && <span>cirkel = straal {straalLabel(straalM)}</span>}
    </div>
  )
}
