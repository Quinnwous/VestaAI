'use client'

import { StatTile } from '@/components/ui'

/** Onder dit aantal eigen verkopen is een gemiddelde looptijd/prijspercentage niet betekenisvol. */
const MIN_N_VOOR_GEMIDDELDE = 3

/**
 * Kerncijfers op de startpagina (masterplan fase 1.6, zie docs/roadmap.md).
 * Client component: de `opmaak`-props zijn functies en StatTile is een client
 * component — als server component crashte deze pagina hard ("Functions
 * cannot be passed directly to Client Components", gevonden 17 sep 2026).
 * Rekenlogica in lib/kerncijfers.ts (pure functies, apart getest); dit
 * component toont alleen. Elke tegel toont n of een waarschuwing bij te
 * weinig data — zie docs/ontwerpprincipes.md § Data.
 */
export function Kerncijfers({
  acquisities,
  winratio,
  inVerkoop,
  verkochtDitJaar,
  gemLooptijdDagen,
  gemPrijsTovVraagprijsPct,
  nEigenVerkopenDitJaar,
}: {
  acquisities: number
  winratio: number | null
  inVerkoop: number
  verkochtDitJaar: number
  gemLooptijdDagen: number | null
  gemPrijsTovVraagprijsPct: number | null
  nEigenVerkopenDitJaar: number
}) {
  const teWeinigData = nEigenVerkopenDitJaar < MIN_N_VOOR_GEMIDDELDE

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
      <StatTile label="Lopende acquisities" waarde={acquisities} />
      <StatTile
        label="Winratio pitches"
        waarde={winratio ?? 0}
        opmaak={n => `${n}%`}
        waarschuwing={winratio === null ? 'Nog geen pitch beslist' : undefined}
        bijschrift="Laatste 12 maanden"
      />
      <StatTile label="In verkoop" waarde={inVerkoop} />
      <StatTile label="Verkocht dit jaar" waarde={verkochtDitJaar} />
      <StatTile
        label="Gem. looptijd"
        waarde={gemLooptijdDagen ?? 0}
        opmaak={n => `${n} dgn`}
        waarschuwing={teWeinigData ? `Nog te weinig eigen verkopen dit jaar (n=${nEigenVerkopenDitJaar})` : undefined}
        bijschrift={!teWeinigData ? `n=${nEigenVerkopenDitJaar} eigen verkopen` : undefined}
      />
      <StatTile
        label="Prijs t.o.v. vraagprijs"
        waarde={gemPrijsTovVraagprijsPct ?? 0}
        opmaak={n => `${n > 0 ? '+' : ''}${n}%`}
        waarschuwing={teWeinigData ? `Nog te weinig eigen verkopen dit jaar (n=${nEigenVerkopenDitJaar})` : undefined}
        bijschrift={!teWeinigData ? `n=${nEigenVerkopenDitJaar} eigen verkopen` : undefined}
      />
    </div>
  )
}
