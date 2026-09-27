'use client'

import dynamic from 'next/dynamic'

// Client-only, ook al is BasisKaart (die WaarderingKaart zelf gebruikt) al
// een eigen dynamic(ssr:false) — dit voorkomt dat WaardebepalingPaneel zelf
// ooit direct hoeft te weten dat de kaartstack canvas/`window` aanraakt.
// Sinds "Twee kaarten in het dossier samenvoegen" (roadmap § 9) is dit de
// enige kaartmount in het dossier: referenties + eigen verkopen als lagen
// van één <BasisKaart>, zie components/WaarderingKaart.tsx.
export const WaarderingKaartClient = dynamic(
  () => import('./WaarderingKaart').then(m => m.WaarderingKaart),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 440, borderRadius: 'var(--merk-radius-md, 12px)', background: '#F4EFE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13.5, color: '#5C6470' }}>Kaart laden…</p>
      </div>
    ),
  },
)
