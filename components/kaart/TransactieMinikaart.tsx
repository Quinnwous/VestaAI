'use client'

/**
 * Minikaart in de transactie-sheet (docs/roadmap.md § 9 "Vóór de demo
 * oppakken") — vervangt de statische `MinikaartPlaceholder` die
 * `TransactiesZoeken.tsx` had staan tot item 7.1/7.3 (`BasisKaart`,
 * MapLibre) gemerged was. Bouwt bewust géén nieuwe kaartlaag: de bestaande
 * `ReferentiesLaag` plaatst met een lege `referenties`-lijst precies één
 * merk-gekleurde `SubjectPin` op het adres — exact wat hier nodig is.
 * `direct` staat aan omdat de kaart in de sheet altijd boven de vouw staat
 * zodra de sheet open is (zie BasisKaart.tsx). `scrollZoom={false}`
 * voorkomt dat scrollen door de sheetinhoud de kaart kaapt; slepen en de
 * zoomknoppen blijven werken ("licht interactief").
 *
 * Verplaatst naar `components/kaart/` op 27 sep 2026 (stond er eerst buiten
 * om overlap met een andere agent te vermijden) — geëxporteerd via
 * `components/kaart/index.ts`.
 */
import { BasisKaart } from './BasisKaart'
import { ReferentiesLaag } from './ReferentiesLaag'
import { colors } from '@/components/ui/tokens'

export type MinikaartStatus = 'laden' | 'ok' | 'onbekend'

function MinikaartLegeStaat({ hoogte, tekst }: { hoogte: number; tekst: string }) {
  return (
    <div
      style={{
        height: hoogte,
        borderRadius: 'var(--merk-radius-card-lg, 18px)',
        border: '1px solid #E6E9EC',
        background: colors.surfaceAlt,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <p style={{ fontSize: 12.5, color: colors.muted, margin: 0 }}>{tekst}</p>
    </div>
  )
}

export function TransactieMinikaart({
  status,
  coordinaat,
  adres,
  hoogte = 190,
}: {
  /** 'laden' terwijl de server action nog bezig is, 'onbekend' als de transactie geen (geldige) coördinaat heeft, 'ok' zodra `coordinaat` gevuld is. */
  status: MinikaartStatus
  coordinaat: { lat: number; lng: number } | null
  /** Voor het aria-label van de pin. */
  adres: string
  hoogte?: number
}) {
  if (status === 'laden') return <MinikaartLegeStaat hoogte={hoogte} tekst="Kaart laden…" />
  if (status !== 'ok' || !coordinaat) return <MinikaartLegeStaat hoogte={hoogte} tekst="Locatie onbekend" />

  return (
    <BasisKaart center={[coordinaat.lng, coordinaat.lat]} zoom={15} hoogte={hoogte} scrollZoom={false} direct>
      <ReferentiesLaag subject={{ lat: coordinaat.lat, lng: coordinaat.lng, label: adres }} referenties={[]} />
    </BasisKaart>
  )
}
