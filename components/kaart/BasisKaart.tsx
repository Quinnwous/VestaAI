'use client'

/**
 * BasisKaart — de ene MapLibre-kaartstack voor de hele app (§ 3.5 van
 * docs/roadmap.md): dynamic import zonder SSR (MapLibre raakt canvas/
 * `window` aan tijdens het eerste render), PDOK BRT-vectortiles in
 * pastelstijl. Geef lagen als children mee — die lezen de kaartinstantie
 * zelf via context (zie `KaartContext.ts`), net als `Verkoopkaart.tsx` dat
 * via react-leaflet deed.
 *
 * Gebruik:
 *   <BasisKaart center={[lng, lat]} zoom={13}>
 *     <VerkopenLaag transacties={verkopen} onHover={setHover} />
 *     <HoverKaart info={hover} />
 *   </BasisKaart>
 */
import dynamic from 'next/dynamic'

export const BasisKaart = dynamic(() => import('./BasisKaartMap').then((m) => m.BasisKaartMap), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 480,
        borderRadius: 'var(--merk-radius-card-lg, 18px)',
        border: '1px solid #E6E9EC',
        background: '#FAFBFB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <p style={{ fontSize: 13.5, color: '#98A0A6' }}>Kaart laden…</p>
    </div>
  ),
})
