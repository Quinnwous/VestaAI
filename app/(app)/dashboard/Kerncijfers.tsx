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
 *
 * Geen pitch-concept meer (besluit Quinn 17 sep 2026, item 1.9c): de
 * winratio-tegel is vervallen. De vrijgekomen plek gaat naar "Gem. looptijd"
 * en "Prijs t.o.v. vraagprijs", beide over de laatste 12 maanden eigen
 * verkopen in plaats van "dit jaar" — dat voorkomt een dubbele tegel.
 */
export function Kerncijfers({
  lopendeVerkoopadviezen,
  inVerkoop,
  verkochtDitJaar,
  gemLooptijdDagen,
  gemPrijsTovVraagprijsPct,
  nEigenVerkopenLaatste12Mnd,
}: {
  lopendeVerkoopadviezen: number
  inVerkoop: number
  verkochtDitJaar: number
  gemLooptijdDagen: number | null
  gemPrijsTovVraagprijsPct: number | null
  nEigenVerkopenLaatste12Mnd: number
}) {
  const teWeinigData = nEigenVerkopenLaatste12Mnd < MIN_N_VOOR_GEMIDDELDE
  const bijschrift = `n=${nEigenVerkopenLaatste12Mnd} eigen verkopen, laatste 12 mnd`
  const waarschuwing = `Nog te weinig eigen verkopen (n=${nEigenVerkopenLaatste12Mnd}, laatste 12 mnd)`

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
      <StatTile label="Lopende verkoopadviezen" waarde={lopendeVerkoopadviezen} />
      <StatTile label="In verkoop" waarde={inVerkoop} />
      <StatTile label="Verkocht dit jaar" waarde={verkochtDitJaar} />
      <StatTile
        label="Gem. looptijd"
        waarde={gemLooptijdDagen ?? 0}
        opmaak={n => `${n} dgn`}
        waarschuwing={teWeinigData ? waarschuwing : undefined}
        bijschrift={!teWeinigData ? bijschrift : undefined}
      />
      <StatTile
        label="Prijs t.o.v. vraagprijs"
        waarde={gemPrijsTovVraagprijsPct ?? 0}
        opmaak={n => `${n > 0 ? '+' : ''}${n}%`}
        waarschuwing={teWeinigData ? waarschuwing : undefined}
        bijschrift={!teWeinigData ? bijschrift : undefined}
      />
    </div>
  )
}
