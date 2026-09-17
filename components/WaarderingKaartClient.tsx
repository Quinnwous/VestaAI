'use client'

import dynamic from 'next/dynamic'

// react-leaflet raakt `window` aan tijdens het eerste render — client-only,
// zelfde patroon als VerkoopkaartClient.tsx.
export const WaarderingKaartClient = dynamic(
  () => import('./WaarderingKaart').then(m => m.WaarderingKaart),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 440, borderRadius: 'var(--merk-radius-md, 12px)', background: '#F4EFE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13.5, color: '#98A0A6' }}>Kaart laden…</p>
      </div>
    ),
  },
)
