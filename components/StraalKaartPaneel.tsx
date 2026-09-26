'use client'

import { useMemo, useState } from 'react'
import { BasisKaart, StraalLaag, VerkopenLaag, HoverKaart, type VerkoopHoverInfo } from '@/components/kaart'
import { EmptyState, Slider } from '@/components/ui'
import { colors, radius } from '@/components/ui/tokens'
import { filterBinnenStraal } from '@/lib/straalFilter'
import type { TransactieMetCoordinaten } from '@/lib/supabase'

const STRAAL_MIN = 100
const STRAAL_MAX = 1000
const STRAAL_STAP = 50
const STRAAL_STANDAARD = 500

function straalLabel(m: number): string {
  return m >= 1000 ? `${(m / 1000).toLocaleString('nl-NL')} km` : `${m} m`
}

/**
 * Straal-uitsnede van de verkoopkaart binnen een woningdossier (item 7.3,
 * docs/roadmap.md § Fase 7 — op de MapLibre-stack, voorheen Leaflet via
 * `Verkoopkaart.tsx`): "in de buurt hebben we al verkocht" als onderbouwing
 * in het verkoopadvies. Filtert de eigen-verkoop-transacties van het
 * kantoor op afstand tot dit adres (`lib/straalFilter.ts`, sorteert op
 * afstand) — zie lib/geo.ts voor waarom dit application-side gebeurt i.p.v.
 * via een PostGIS-query. `eigenVerkopen` komt via `lib/transactiesQuery.ts`
 * binnen (zie de pagina die dit dossier rendert) — dit component doet zelf
 * geen databasequery.
 */
export function StraalKaartPaneel({
  lat,
  lng,
  eigenVerkopen,
}: {
  lat: number | null
  lng: number | null
  eigenVerkopen: TransactieMetCoordinaten[]
}) {
  const [straal, setStraal] = useState<number>(STRAAL_STANDAARD)
  const [hover, setHover] = useState<VerkoopHoverInfo | null>(null)

  const binnenStraal = useMemo(
    () => (lat === null || lng === null ? [] : filterBinnenStraal(eigenVerkopen, [lat, lng], straal)),
    [eigenVerkopen, lat, lng, straal],
  )

  // Lege staat: geen coördinaat voor dit adres — de adresverrijking is niet
  // gelukt, zie CLAUDE.md § lib/verrijking.ts. Zonder lat/lng is er niets om
  // op een kaart te tonen.
  if (lat === null || lng === null) {
    return (
      <EmptyState
        titel="Geen locatiegegevens"
        beschrijving="Dit adres kon niet gekoppeld worden aan coördinaten, dus kan de buurtstraal hier niet getoond worden."
      />
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 13, color: colors.body, margin: 0 }}>
          {binnenStraal.length > 0
            ? `${binnenStraal.length} eigen verko${binnenStraal.length === 1 ? 'op' : 'pen'} binnen ${straalLabel(straal)}`
            : 'Nog geen eigen verkopen binnen deze straal'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 240px', maxWidth: 340 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: colors.muted, whiteSpace: 'nowrap' }}>{straalLabel(STRAAL_MIN)}</span>
          <div style={{ flex: 1 }}>
            <Slider waarde={straal} min={STRAAL_MIN} max={STRAAL_MAX} stap={STRAAL_STAP} ariaLabel="Straal" onChange={setStraal} />
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: colors.muted, whiteSpace: 'nowrap' }}>{straalLabel(STRAAL_MAX)}</span>
          <span
            style={{
              fontSize: 12.5, fontWeight: 800, color: 'var(--merk-diep, var(--merk))', minWidth: 54,
              textAlign: 'right', fontVariantNumeric: 'tabular-nums',
            }}
          >
            {straalLabel(straal)}
          </span>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <BasisKaart center={[lng, lat]} zoom={15} hoogte={320} scrollZoom={false}>
          <StraalLaag center={[lng, lat]} straalM={straal} />
          <VerkopenLaag transacties={binnenStraal} onHover={setHover} />
          <HoverKaart info={hover} />
        </BasisKaart>
        {binnenStraal.length === 0 && (
          <div
            style={{
              position: 'absolute', inset: 0, zIndex: 6, display: 'grid', placeItems: 'center',
              background: 'rgba(247,248,249,.72)', borderRadius: radius.cardLg, pointerEvents: 'none',
            }}
          >
            <p
              style={{
                background: colors.surface, border: `1px dashed ${colors.borderStrong}`, borderRadius: radius.md,
                padding: '10px 16px', fontSize: 12.5, color: colors.body, margin: 0, textAlign: 'center', maxWidth: 260,
              }}
            >
              Nog geen eigen verkopen binnen deze straal — vergroot de straal of wacht op meer data.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
