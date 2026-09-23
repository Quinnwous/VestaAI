'use client'

/**
 * Tijdelijke proof voor roadmap-item 7.1 (§ 4 DoD): bewijst dat
 * BasisKaart/VerkopenLaag/HoverKaart écht werken met de eigen verkopen van
 * het kantoor, achter `?kaart=v2` op `/marktanalyse/kaart`. De
 * standaardweergave blijft Leaflet (`VerkoopkaartExplorer`) tot de volledige
 * port in item 7.2 — dit bestand mag daarna weg.
 */
import { useMemo, useState } from 'react'
import { BasisKaart, VerkopenLaag, HoverKaart, type VerkoopHoverInfo } from '@/components/kaart'
import { boundsUitPunten } from '@/lib/kaart'
import type { TransactieMetCoordinaten } from '@/lib/supabase'

export function VerkoopkaartV2Proof({ transacties }: { transacties: TransactieMetCoordinaten[] }) {
  const [hover, setHover] = useState<VerkoopHoverInfo | null>(null)
  const [geselecteerdId, setGeselecteerdId] = useState<string | null>(null)

  const punten = useMemo(
    () =>
      transacties.filter(
        (t): t is TransactieMetCoordinaten & { lat: number; lng: number } => t.lat !== null && t.lng !== null,
      ),
    [transacties],
  )
  const bounds = useMemo(() => boundsUitPunten(punten), [punten])

  if (punten.length === 0) {
    return (
      <div
        style={{
          height: 560,
          borderRadius: 'var(--merk-radius-card-lg, 18px)',
          border: '1px dashed #E1E5E9',
          background: '#FAFBFB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <p style={{ fontSize: 13.5, color: '#98A0A6', maxWidth: 320 }}>
          Nog geen eigen verkopen met coördinaten — proof v2 vult zich zodra die er zijn.
        </p>
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: 12.5, color: '#98A0A6', margin: '0 0 12px' }}>
        Proof v2 (MapLibre + PDOK-vectortiles, pastelstijl) — {punten.length} eigen verkopen met coördinaten.
      </p>
      <BasisKaart bounds={bounds} hoogte={560}>
        <VerkopenLaag
          transacties={transacties}
          geselecteerdId={geselecteerdId}
          onHover={setHover}
          onSelect={setGeselecteerdId}
        />
        <HoverKaart info={hover} />
      </BasisKaart>
    </div>
  )
}
