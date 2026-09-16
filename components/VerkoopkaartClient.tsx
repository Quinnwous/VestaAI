'use client'

import dynamic from 'next/dynamic'

// react-leaflet raakt `window` aan tijdens het eerste render — moet dus
// client-only geladen worden, ook al is deze wrapper zelf al 'use client'.
export const VerkoopkaartClient = dynamic(
  () => import('./Verkoopkaart').then(m => m.Verkoopkaart),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 480, borderRadius: 'var(--merk-radius-card-lg, 18px)', border: '1px solid #E6E9EC', background: '#FAFBFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13.5, color: '#98A0A6' }}>Kaart laden…</p>
      </div>
    ),
  },
)
