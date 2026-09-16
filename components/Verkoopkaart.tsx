'use client'

import 'leaflet/dist/leaflet.css'
import { useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Circle } from 'react-leaflet'
import type { TransactieMetCoordinaten } from '@/lib/supabase'

// PDOK BRT-Achtergrondkaart: gratis, geen account/sleutel nodig, Nederlandse
// kaartstijl — zie CLAUDE.md § Techniek. Bron: Kadaster/PDOK.
const PDOK_TILES = 'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png'
const PDOK_ATTRIBUTIE = 'Kaartgegevens: <a href="https://www.pdok.nl/" target="_blank" rel="noopener">PDOK</a> / Kadaster'

function formatEuro(bedrag: number | null): string {
  if (bedrag === null) return '—'
  return `€${bedrag.toLocaleString('nl-NL')}`
}

function formatDatum(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Verkoopkaart — herbruikbaar in twee vormen (besluit 16 sep 2026, zie
 * CLAUDE.md § Hoofdstructuur): volledig scherm onder Marktinzichten, en een
 * straal-uitsnede in een woningdossier (via `center` + `straalM`). Toont
 * uitsluitend `eigen_verkoop`-transacties als vlaggetje — de rest van de
 * dataset voedt waardering en marktanalyse, niet deze kaart.
 */
export function Verkoopkaart({
  transacties,
  center,
  straalM,
  hoogte = 480,
  merkKleur = 'var(--merk, #1A6B45)',
}: {
  transacties: TransactieMetCoordinaten[]
  /** [lat, lng] — middelpunt van een woningadres bij een straal-uitsnede. Zonder dit: gecentreerd op de eigen verkopen. */
  center?: [number, number]
  /** Straal in meters, alleen relevant met `center` (250/500/1000). */
  straalM?: number
  hoogte?: number | string
  merkKleur?: string
}) {
  const punten = useMemo(
    () => transacties.filter((t): t is TransactieMetCoordinaten & { lat: number; lng: number } => t.lat !== null && t.lng !== null),
    [transacties],
  )

  const middelpunt: [number, number] = center ?? (punten.length > 0
    ? [punten.reduce((s, p) => s + p.lat, 0) / punten.length, punten.reduce((s, p) => s + p.lng, 0) / punten.length]
    : [52.1326, 4.4025]) // NL-centroïde als nooddefault, zonder data of center

  if (punten.length === 0 && !center) {
    return (
      <div style={{ height: hoogte, borderRadius: 'var(--merk-radius-card-lg, 18px)', border: '1px dashed #E1E5E9', background: '#FAFBFB', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
        <p style={{ fontSize: 13.5, color: '#98A0A6', maxWidth: 320 }}>
          Nog geen eigen verkopen met coördinaten geïmporteerd — de kaart vult zich automatisch zodra de transactiedataset binnen is.
        </p>
      </div>
    )
  }

  return (
    <div style={{ height: hoogte, borderRadius: 'var(--merk-radius-card-lg, 18px)', overflow: 'hidden', border: '1px solid #E6E9EC' }}>
      <MapContainer center={middelpunt} zoom={center ? 15 : 13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={!center}>
        <TileLayer url={PDOK_TILES} attribution={PDOK_ATTRIBUTIE} maxZoom={19} />
        {center && straalM && (
          <Circle center={center} radius={straalM} pathOptions={{ color: merkKleur, fillColor: merkKleur, fillOpacity: 0.08, weight: 1.5 }} />
        )}
        {punten.map(p => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={8}
            pathOptions={{ color: '#fff', weight: 2, fillColor: merkKleur, fillOpacity: 1 }}
          >
            <Popup>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                <strong>{p.adres}</strong><br />
                {formatEuro(p.verkoopprijs)} · {formatDatum(p.verkoopdatum)}<br />
                {p.woonoppervlak_m2 ? `${p.woonoppervlak_m2} m²` : ''}
                {p.woningtype ? ` · ${p.woningtype}` : ''}
                {p.energielabel ? ` · label ${p.energielabel}` : ''}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
