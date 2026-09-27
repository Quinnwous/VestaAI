'use client'

/**
 * ReferentiePin — genummerde ronde marker voor een waarderingsreferentie op
 * de referentiekaart (item 7.3). Uitgesloten referenties tonen gedimd (zie
 * `ReferentiesLaag`). 1-op-1 dezelfde SVG als de vroegere Leaflet-versie van
 * `components/WaarderingKaart.tsx`.
 */
export function ReferentiePin({ nummer, uitgesloten = false }: { nummer: number; uitgesloten?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 30"
      width={24}
      height={30}
      style={{
        display: 'block',
        overflow: 'visible',
        filter: 'drop-shadow(0 2px 3px rgba(20,24,27,.28))',
        opacity: uitgesloten ? 0.45 : 1,
      }}
    >
      <path
        d="M12 1.5C6.7 1.5 2.3 5.8 2.3 11c0 7.3 9.7 16.6 9.7 16.6S21.7 18.3 21.7 11c0-5.2-4.4-9.5-9.7-9.5z"
        fill="var(--merk)"
        stroke="#fff"
        strokeWidth={1.6}
      />
      <text x={12} y={14.6} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fff" fontFamily="inherit">
        {nummer}
      </text>
    </svg>
  )
}
