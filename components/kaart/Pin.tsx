'use client'

/**
 * Mini-beeldmerk-pin (docs/ontwerp/README.md § 6, SVG 1-op-1 overgenomen
 * uit `docs/ontwerp/verkoopkaart.html` `.pin svg`): rode ruit-omlijning
 * (`--merk-accent`), blauwe ruit (`--merk`), wit hart, rood stokje naar het
 * ankerpunt onderaan. Bron van waarheid voor de SVG — `VerkopenLaag`
 * rendert 'm met `renderToStaticMarkup` naar een marker-element, zodat er
 * nooit twee versies van de pin bestaan.
 *
 * Gebruik: <Pin variant="gekozen" /> of <Pin variant="cluster" aantal={12} />
 */
export type PinVariant = 'normaal' | 'hover' | 'gekozen' | 'cluster'

export function Pin({ variant = 'normaal', aantal }: { variant?: PinVariant; aantal?: number }) {
  if (variant === 'cluster') {
    return (
      <svg
        width={34}
        height={34}
        viewBox="0 0 34 34"
        style={{ display: 'block', filter: 'drop-shadow(0 2px 3px rgba(20,24,27,.30))' }}
      >
        <circle cx={17} cy={17} r={15} fill="var(--merk)" stroke="var(--merk-accent)" strokeWidth={2} />
        <text x={17} y={17.5} textAnchor="middle" dominantBaseline="middle" fontSize={12} fontWeight={700} fill="#fff">
          {aantal}
        </text>
      </svg>
    )
  }

  const ruitKleur = variant === 'hover' || variant === 'gekozen' ? 'var(--merk-diep)' : 'var(--merk)'
  const ringKleur = variant === 'gekozen' ? 'var(--merk-diep)' : 'var(--merk-accent)'
  const haloOpacity = variant === 'gekozen' || variant === 'hover' ? 0.22 : 0

  return (
    <svg
      width={26}
      height={32}
      viewBox="0 0 26 32"
      style={{ display: 'block', overflow: 'visible', filter: 'drop-shadow(0 2px 3px rgba(20,24,27,.30))' }}
    >
      <circle cx={13} cy={13} r={15} fill="var(--merk)" opacity={haloOpacity} />
      <path d="M13 2.5 23.5 13 13 23.5 2.5 13Z" fill="none" stroke={ringKleur} strokeWidth={2} />
      <path d="M13 6.5 19.5 13 13 19.5 6.5 13Z" fill={ruitKleur} />
      <circle cx={13} cy={13} r={2.1} fill="#fff" />
      <path d="M13 23.5v6" stroke="var(--merk-accent)" strokeWidth={2} strokeLinecap="round" />
    </svg>
  )
}
