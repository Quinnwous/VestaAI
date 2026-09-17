'use client'

import 'leaflet/dist/leaflet.css'
import { useMemo } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Circle, Tooltip } from 'react-leaflet'
import type { WaarderingReferentie } from '@/lib/waardering'

const PDOK_TILES = 'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png'
const PDOK_ATTRIBUTIE = 'Kaartgegevens: <a href="https://www.pdok.nl/" target="_blank" rel="noopener">PDOK</a> / Kadaster'

function formatEuro(n: number): string {
  return `€ ${Math.round(n).toLocaleString('nl-NL')}`
}

function formatDatum(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Beeldmerk-pin voor het subject (adres zelf): blauwe ruit, rode omlijning + stokje — docs/ontwerp/README.md § 6. */
function subjectIcon(): L.DivIcon {
  const svg = `<svg viewBox="0 0 26 32" width="36" height="44" style="overflow:visible"><circle cx="13" cy="13" r="15" fill="var(--merk)" opacity=".22"/><path d="M13 2.5 23.5 13 13 23.5 2.5 13Z" fill="none" stroke="var(--merk-accent)" stroke-width="2.6"/><path d="M13 6.5 19.5 13 13 19.5 6.5 13Z" fill="var(--merk)"/><circle cx="13" cy="13" r="2.4" fill="#fff"/><path d="M13 23.5v7" stroke="var(--merk-accent)" stroke-width="2.6" stroke-linecap="round"/></svg>`
  return L.divIcon({ html: svg, className: 'wb-subject-icon', iconSize: [36, 44], iconAnchor: [18, 44] })
}

/** Genummerde referentiepin (rond, merkkleur, wit cijfer). */
function referentieIcon(nummer: number, uitgesloten: boolean): L.DivIcon {
  const svg = `<svg viewBox="0 0 24 30" width="24" height="30" style="overflow:visible;filter:drop-shadow(0 2px 3px rgba(20,24,27,.28))"><path d="M12 1.5C6.7 1.5 2.3 5.8 2.3 11c0 7.3 9.7 16.6 9.7 16.6S21.7 18.3 21.7 11c0-5.2-4.4-9.5-9.7-9.5z" fill="var(--merk)" stroke="#fff" stroke-width="1.6"/><text x="12" y="14.6" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="inherit">${nummer}</text></svg>`
  return L.divIcon({
    html: svg,
    className: uitgesloten ? 'wb-ref-icon wb-ref-icon-dim' : 'wb-ref-icon',
    iconSize: [24, 30],
    iconAnchor: [12, 30],
  })
}

/**
 * Referentiekaart van het waardebepalingspaneel (item 4.6, docs/roadmap.md §
 * 3.3/3.8): bestaande Leaflet-patroon (`Verkoopkaart.tsx`/`StraalKaartPaneel.tsx`)
 * — MapLibre + PDOK-vectortiles is fase 7. Subject-marker in het midden,
 * straalcirkel, genummerde referentiepins (uitgesloten = gedimd), hover toont
 * adres/prijs/datum via een Leaflet-tooltip. Referenties zonder lat/lng
 * (handmatig toegevoegd, § transactiesQuery.ts `haalTransactiesOpId`) staan
 * niet op de kaart — alleen in de tabel.
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
  const center: [number, number] = [subject.lat, subject.lng]
  const subjectIconMemo = useMemo(() => subjectIcon(), [])

  // Kader op de straalcirkel (± 30% marge) i.p.v. een vaste zoom — de straal
  // loopt via de verbredingsladder (§ 3.3) op van 750 m tot 5 km, een vaste
  // zoom 15 zou een brede selectie afsnijden.
  const straal = straalM ?? 750
  const dLat = ((straal * 1.3) / 111_320)
  const dLng = dLat / Math.cos((subject.lat * Math.PI) / 180)
  const bounds: [[number, number], [number, number]] = [
    [subject.lat - dLat, subject.lng - dLng],
    [subject.lat + dLat, subject.lng + dLng],
  ]

  return (
    <div style={{ height: hoogte, borderRadius: 'var(--merk-radius-md, 12px)', overflow: 'hidden', position: 'relative' }}>
      <MapContainer bounds={bounds} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer url={PDOK_TILES} attribution={PDOK_ATTRIBUTIE} maxZoom={19} />
        {straalM && (
          <Circle center={center} radius={straalM} pathOptions={{ color: 'var(--merk)', fillColor: 'var(--merk)', fillOpacity: 0.08, weight: 1.5, dashArray: '5 4' }} />
        )}
        <Marker position={center} icon={subjectIconMemo}>
          <Tooltip direction="top" offset={[0, -44]} opacity={1}>
            <strong>Dit adres</strong><br />{subject.adres}
          </Tooltip>
        </Marker>
        {referenties.map((r, i) => (
          <Marker key={r.id} position={[r.lat, r.lng]} icon={referentieIcon(i + 1, uitgeslotenIds.has(r.id))}>
            <Tooltip direction="top" offset={[0, -28]} opacity={1}>
              <div style={{ fontSize: 12.5 }}>
                <strong>{r.adres}</strong>{r.handmatig ? ' · handmatig' : ''}<br />
                {formatDatum(r.verkoopdatum)} · {r.m2} m²<br />
                <strong>{formatEuro(r.prijs)}</strong>
              </div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
      <div
        style={{
          position: 'absolute', left: 10, bottom: 10, zIndex: 500, background: 'rgba(255,255,255,.9)',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(20,24,27,.07)',
          borderRadius: 'var(--merk-radius-pill, 9999px)', padding: '6px 13px 6px 9px', fontSize: 11, fontWeight: 600,
          color: '#2C3238', display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 1px 2px rgba(20,24,27,.04)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <svg width="14" height="17" viewBox="0 0 26 32"><circle cx="13" cy="13" r="15" fill="var(--merk)" opacity=".22" /><path d="M13 2.5 23.5 13 13 23.5 2.5 13Z" fill="none" stroke="var(--merk-accent)" strokeWidth={2.6} /><path d="M13 6.5 19.5 13 13 19.5 6.5 13Z" fill="var(--merk)" /></svg>
          dit adres
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <svg width="12" height="15" viewBox="0 0 24 30"><path d="M12 1.5C6.7 1.5 2.3 5.8 2.3 11c0 7.3 9.7 16.6 9.7 16.6S21.7 18.3 21.7 11c0-5.2-4.4-9.5-9.7-9.5z" fill="var(--merk)" stroke="#fff" strokeWidth={1.6} /></svg>
          referentie
        </span>
        {straalM && <span>cirkel = straal {straalM >= 1000 ? `${straalM / 1000} km` : `${straalM} m`}</span>}
      </div>
    </div>
  )
}
