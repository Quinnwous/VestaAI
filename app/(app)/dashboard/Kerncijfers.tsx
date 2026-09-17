'use client'

import type { ReactNode } from 'react'
import { StatTile } from '@/components/ui'
import { formatDatum } from '@/lib/utils'
import { MIN_N_VOOR_GEMIDDELDE, type VerkochtMetDelta, type LooptijdVergelijk, type Marktaandeel } from '@/lib/kerncijfers'

/**
 * Kerncijfers op de startpagina (masterplan fase 1.6, zie docs/roadmap.md).
 * Client component: de `opmaak`-props zijn functies en StatTile is een client
 * component — als server component crashte deze pagina hard ("Functions
 * cannot be passed directly to Client Components", gevonden 17 sep 2026).
 * Rekenlogica in lib/kerncijfers.ts (pure functies, apart getest); dit
 * component toont alleen. Elke tegel toont n of een waarschuwing bij te
 * weinig data — zie docs/ontwerpprincipes.md § Data.
 *
 * Item 2.5 (docs/roadmap.md § 5 Fase 2): zes tegels uit de transactiedataset
 * i.p.v. de eerdere vijf — volgorde en inhoud volgens docs/ontwerp/startpagina.html
 * (de visuele v2 met hero-tegel/sparklines komt pas in fase 10, dit is de
 * bestaande tegelstijl): Verkocht laatste 12 mnd (met delta) · Gem. looptijd
 * (met markt) · Marktaandeel <plaats> · Prijs t.o.v. vraagprijs · In verkoop ·
 * Lopende verkoopadviezen. Elke transactietegel toont n en "data t/m".
 */

function metDataTotEnMet(tekst: string, dataTotIso: string | null): ReactNode {
  if (!dataTotIso) return tekst
  return (
    <>
      {tekst}
      <br />
      data t/m {formatDatum(dataTotIso)}
    </>
  )
}

function deltaTekst(deltaPct: number | null): string | null {
  if (deltaPct == null) return null
  const pijl = deltaPct > 0 ? '▲' : deltaPct < 0 ? '▼' : '–'
  return `${pijl} ${deltaPct > 0 ? '+' : ''}${deltaPct}% t.o.v. vorige 12 mnd`
}

export function Kerncijfers({
  lopendeVerkoopadviezen,
  inVerkoop,
  verkocht,
  gemLooptijdDagen,
  nEigenVerkopenLaatste12Mnd,
  looptijdVsMarkt,
  gemPrijsTovVraagprijsPct,
  marktaandeelPlaats,
  marktaandeel,
  dataTotEnMet,
}: {
  lopendeVerkoopadviezen: number
  inVerkoop: number
  verkocht: VerkochtMetDelta
  gemLooptijdDagen: number | null
  nEigenVerkopenLaatste12Mnd: number
  looptijdVsMarkt: LooptijdVergelijk
  gemPrijsTovVraagprijsPct: number | null
  marktaandeelPlaats: string | null
  marktaandeel: Marktaandeel
  dataTotEnMet: string | null
}) {
  const teWeinigEigenData = nEigenVerkopenLaatste12Mnd < MIN_N_VOOR_GEMIDDELDE
  const weinigDataWaarschuwing = `Nog te weinig eigen verkopen (n=${nEigenVerkopenLaatste12Mnd}, laatste 12 mnd)`

  // "Verkocht" is een telling, geen gemiddelde — die blijft ook bij een kleine
  // n gewoon het echte aantal. Puur bij 0 eigen verkopen (bv. i4 Housing, nog
  // geen data) een expliciete lege staat i.p.v. een kale "0"-tegel.
  const geenEigenVerkopen = verkocht.aantal === 0 && verkocht.vorigAantal === 0
  const verkochtDelta = deltaTekst(verkocht.deltaPct)

  const marktaandeelTeWeinig = marktaandeel.eigenN < MIN_N_VOOR_GEMIDDELDE || marktaandeel.marktN === 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
      <StatTile
        label="Verkocht laatste 12 maanden"
        waarde={geenEigenVerkopen ? undefined : verkocht.aantal}
        waarschuwing={geenEigenVerkopen ? 'Nog geen eigen verkopen in de transactiedataset' : undefined}
        bijschrift={
          geenEigenVerkopen
            ? undefined
            : metDataTotEnMet(
                verkochtDelta ?? `n=${verkocht.aantal} eigen verkopen, laatste 12 mnd`,
                dataTotEnMet,
              )
        }
      />
      <StatTile
        label="Gem. looptijd"
        waarde={gemLooptijdDagen ?? 0}
        opmaak={n => `${n} dgn`}
        waarschuwing={teWeinigEigenData ? weinigDataWaarschuwing : undefined}
        bijschrift={
          teWeinigEigenData
            ? undefined
            : metDataTotEnMet(
                looptijdVsMarkt.marktGemLooptijd != null && looptijdVsMarkt.deltaDagen != null
                  ? `${looptijdVsMarkt.deltaDagen > 0 ? '+' : ''}${looptijdVsMarkt.deltaDagen} dgn vs markt (${looptijdVsMarkt.marktGemLooptijd} dgn) · n=${nEigenVerkopenLaatste12Mnd}`
                  : `n=${nEigenVerkopenLaatste12Mnd} eigen verkopen, laatste 12 mnd`,
                dataTotEnMet,
              )
        }
      />
      <StatTile
        label={marktaandeelPlaats ? `Marktaandeel ${marktaandeelPlaats}` : 'Marktaandeel'}
        waarde={marktaandeelTeWeinig ? undefined : (marktaandeel.aandeelPct ?? 0)}
        opmaak={n => `${n}%`}
        waarschuwing={
          !marktaandeelPlaats
            ? 'Werkgebied nog niet ingesteld'
            : marktaandeel.marktN === 0
              ? `Nog geen markttransacties bekend voor ${marktaandeelPlaats}`
              : marktaandeelTeWeinig
                ? `Nog te weinig eigen verkopen in ${marktaandeelPlaats} (n=${marktaandeel.eigenN}, laatste 12 mnd)`
                : undefined
        }
        bijschrift={
          marktaandeelTeWeinig || !marktaandeelPlaats
            ? undefined
            : metDataTotEnMet(
                `n=${marktaandeel.eigenN} van ${marktaandeel.marktN} verkopen, laatste 12 mnd`,
                dataTotEnMet,
              )
        }
      />
      <StatTile
        label="Prijs t.o.v. vraagprijs"
        waarde={gemPrijsTovVraagprijsPct ?? 0}
        opmaak={n => `${n > 0 ? '+' : ''}${n}%`}
        waarschuwing={teWeinigEigenData ? weinigDataWaarschuwing : undefined}
        bijschrift={
          teWeinigEigenData
            ? undefined
            : metDataTotEnMet(`n=${nEigenVerkopenLaatste12Mnd} eigen verkopen, laatste 12 mnd`, dataTotEnMet)
        }
      />
      <StatTile label="In verkoop" waarde={inVerkoop} />
      <StatTile label="Lopende verkoopadviezen" waarde={lopendeVerkoopadviezen} />
    </div>
  )
}
