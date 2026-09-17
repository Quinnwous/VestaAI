'use client'

import { useMemo, useState } from 'react'
import { VerkoopkaartClient } from './VerkoopkaartClient'
import { afstandMeters } from '@/lib/geo'
import type { TransactieMetCoordinaten } from '@/lib/supabase'

const STRALEN = [250, 500, 1000] as const

/**
 * Straal-uitsnede van de verkoopkaart binnen een woningdossier (F5, besluit
 * 16 sep 2026): "in de buurt hebben we al verkocht" als onderbouwing in het
 * verkoopadvies. Filtert de eigen-verkoop-transacties van het kantoor op
 * afstand tot dit adres — zie lib/geo.ts voor waarom dit application-side
 * gebeurt in plaats van via een PostGIS-query.
 */
export function StraalKaartPaneel({
  lat,
  lng,
  eigenVerkopen,
}: {
  lat: number
  lng: number
  eigenVerkopen: TransactieMetCoordinaten[]
}) {
  const [straal, setStraal] = useState<(typeof STRALEN)[number]>(500)

  const binnenStraal = useMemo(
    () => eigenVerkopen.filter(t => t.lat !== null && t.lng !== null && afstandMeters([lat, lng], [t.lat, t.lng]) <= straal),
    [eigenVerkopen, lat, lng, straal],
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: '#5C6470' }}>
          {binnenStraal.length > 0
            ? `${binnenStraal.length} eigen verko${binnenStraal.length === 1 ? 'op' : 'pen'} binnen ${straal >= 1000 ? `${straal / 1000} km` : `${straal} m`}`
            : 'Nog geen eigen verkopen binnen deze straal'}
        </p>
        <div style={{ display: 'inline-flex', borderRadius: 10, overflow: 'hidden', border: '1px solid #E1E5E9' }}>
          {STRALEN.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStraal(s)}
              style={{ padding: '6px 12px', fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer', background: straal === s ? 'var(--merk)' : '#fff', color: straal === s ? '#fff' : '#5C6470' }}
            >
              {s >= 1000 ? `${s / 1000} km` : `${s} m`}
            </button>
          ))}
        </div>
      </div>
      <VerkoopkaartClient transacties={binnenStraal} center={[lat, lng]} straalM={straal} hoogte={320} />
    </div>
  )
}
