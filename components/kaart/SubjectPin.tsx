'use client'

/**
 * SubjectPin — beeldmerk-marker voor het eigen adres ("dit adres") op de
 * referentiekaart in de waardering (item 7.3): blauwe ruit, rode ring, wit
 * hart, rood stokje naar het ankerpunt onderaan — 1-op-1 dezelfde SVG als de
 * vroegere Leaflet-versie van `components/WaarderingKaart.tsx`. Onderscheidt
 * zich bewust van `Pin.tsx` (de verkoopkaart-pin, ander doel): dit is altijd
 * één subject, nooit een lijst.
 */
export function SubjectPin() {
  return (
    <svg
      viewBox="0 0 26 32"
      width={36}
      height={44}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <circle cx={13} cy={13} r={15} fill="var(--merk)" opacity={0.22} />
      <path d="M13 2.5 23.5 13 13 23.5 2.5 13Z" fill="none" stroke="var(--merk-accent)" strokeWidth={2.6} />
      <path d="M13 6.5 19.5 13 13 19.5 6.5 13Z" fill="var(--merk)" />
      <circle cx={13} cy={13} r={2.4} fill="#fff" />
      <path d="M13 23.5v7" stroke="var(--merk-accent)" strokeWidth={2.6} strokeLinecap="round" />
    </svg>
  )
}
