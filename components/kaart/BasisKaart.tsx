'use client'

/**
 * BasisKaart — de ene MapLibre-kaartstack voor de hele app (§ 5 van
 * docs/architectuur.md): dynamic import zonder SSR (MapLibre raakt canvas/
 * `window` aan tijdens het eerste render), PDOK BRT-vectortiles in
 * pastelstijl. Geef lagen als children mee — die lezen de kaartinstantie
 * zelf via context (zie `KaartContext.ts`).
 *
 * **Laadgrens (item 12.5, 27 sep 2026):** standaard mount de echte kaart
 * (chunk + tiles + WebGL-init) pas zodra de container binnen ~200 px van de
 * viewport komt (`IntersectionObserver`) — tot die tijd staat er een skelet
 * op precies de opgegeven `hoogte`, dus geen layout-shift. Voor een kaart die
 * al boven-de-vouw zichtbaar is (bv. `/marktanalyse/kaart`, de kaartweergave
 * van `/woningen`) geef je `direct` mee: die mount meteen, net als vroeger.
 *
 * Gebruik:
 *   <BasisKaart center={[lng, lat]} zoom={13}>
 *     <VerkopenLaag transacties={verkopen} onHover={setHover} />
 *     <HoverKaart info={hover} />
 *   </BasisKaart>
 */
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import type { BasisKaartMapProps } from './BasisKaartMap'
import { KAART_LAADGRENS_ROOT_MARGIN, moetKaartMonteren } from './basisKaartLaadgrens'

const BasisKaartMapLazy = dynamic<BasisKaartMapProps>(
  () => import('./BasisKaartMap').then((m) => m.BasisKaartMap),
  {
    ssr: false,
    // Geen eigen skelet hier — de wrapper hieronder houdt de ruimte met
    // `minHeight` al bezet op de juiste `hoogte`, dus een leeg tussenresultaat
    // tijdens het downloaden van de chunk geeft geen sprong.
    loading: () => null,
  },
)

function KaartSkelet({ hoogte }: { hoogte?: number | string }) {
  return (
    <div
      style={{
        height: hoogte ?? 480,
        borderRadius: 'var(--merk-radius-card-lg, 18px)',
        border: '1px solid #E6E9EC',
        background: '#FAFBFB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <p style={{ fontSize: 13.5, color: '#5C6470' }}>Kaart laden…</p>
    </div>
  )
}

export interface BasisKaartProps extends BasisKaartMapProps {
  /**
   * Kaart staat al boven-de-vouw (bv. `/marktanalyse/kaart`, de kaartweergave
   * van `/woningen`) — mount meteen i.p.v. te wachten op de
   * IntersectionObserver.
   */
  direct?: boolean
}

export function BasisKaart({ direct = false, hoogte, ...rest }: BasisKaartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [zichtbaar, setZichtbaar] = useState(() => moetKaartMonteren(direct, false))

  useEffect(() => {
    if (zichtbaar) return
    const el = containerRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      // Vangnet: geen IO-support (of geen element om te observeren) —
      // gewoon meteen laden i.p.v. de kaart voorgoed verborgen houden.
      setZichtbaar(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (moetKaartMonteren(direct, entries[0]?.isIntersecting ?? false)) setZichtbaar(true)
      },
      { rootMargin: KAART_LAADGRENS_ROOT_MARGIN },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [direct, zichtbaar])

  return (
    <div ref={containerRef} style={{ minHeight: hoogte ?? 480 }}>
      {zichtbaar ? <BasisKaartMapLazy hoogte={hoogte} {...rest} /> : <KaartSkelet hoogte={hoogte} />}
    </div>
  )
}
