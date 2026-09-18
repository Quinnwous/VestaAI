// ===========================================================================
// Item 4.7 — de waardebepaling-pdf rendert écht, en past op één pagina.
//
// Waarom een test die een heel pdf-document bouwt: react-pdf valideert zijn
// stylesheet pas tijdens het renderen. Een style-prop die de renderer niet
// kent (of een `<View>` zonder flexDirection, zie de Satori-crash in
// app/opengraph-image.tsx) laat niet de build maar de route klappen — bij een
// makelaar die op "Waardebepaling-pdf" drukt. typecheck en build zien dat niet.
//
// Geen netwerk: `logoUrl: null` valt terug op de kantoornaam. De echte
// logo-URL wordt vooraf afgevangen door `bruikbaarLogo()` in lib/branding.ts.
// ===========================================================================

import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import type * as ReactPDF from '@react-pdf/renderer'
import { WaardebepalingPdfTemplate } from './WaardebepalingPdfTemplate'
import { berekenWaarderingV2, type Kandidaat, type SubjectV2 } from '@/lib/waardering'
import type { PropertyInput } from '@/lib/schemas'

const SUBJECT: SubjectV2 = {
  woningtype_groep: 'rijwoning', oppervlak_m2: 120, bouwjaar: 1965, lat: 52.1425, lng: 4.403, plaats: 'Wassenaar',
  garage: true, tuin: true, energielabel: 'C',
}

const ref = (id: string, adres: string, m2: number, bouwjaar: number, verkoopdatum: string, verkoopprijs: number, afstand_m: number): Kandidaat =>
  ({ id, adres, plaats: 'Wassenaar', woningtype_groep: 'rijwoning', woonoppervlak_m2: m2, bouwjaar, verkoopdatum, verkoopprijs, afstand_m })

const KANDIDATEN: Kandidaat[] = [
  ref('r1', 'Kerkstraat 12', 115, 1962, '2026-05-14', 715000, 180),
  ref('r2', 'Molenweg 3', 128, 1970, '2026-02-02', 760000, 420),
  ref('r3', 'Lindelaan 8', 110, 1958, '2025-11-20', 640000, 650),
  ref('r4', 'Dorpsstraat 41', 122, 1966, '2025-08-08', 705000, 300),
  ref('r5', 'Beukenhof 5', 135, 1975, '2025-04-15', 790000, 700),
  ref('r6', 'Vijverweg 22', 118, 1961, '2024-12-10', 660000, 520),
  ref('r7', 'Parklaan 14', 125, 1968, '2024-10-01', 700000, 240),
  ref('r8', 'Zandpad 7', 105, 1955, '2024-07-20', 600000, 610),
]

const INVOER = {
  adres: 'Kerkstraat 1, Wassenaar',
  woningtype_groep: 'rijwoning',
  kamers: 5,
  oppervlak_m2: 120,
  bouwjaar: 1965,
  energielabel: 'C',
} as unknown as PropertyInput

function maakPdf(opties: { correctie?: { waarde: number; motivatie: string; datum: string } | null; logoUrl?: string | null } = {}) {
  const uitkomst = berekenWaarderingV2(SUBJECT, KANDIDATEN, { peildatum: '2026-09-01' })
  return renderToBuffer(React.createElement(WaardebepalingPdfTemplate, {
    address: 'Kerkstraat 1, Wassenaar',
    input: INVOER,
    uitkomst,
    correctie: opties.correctie ?? null,
    kantoor: { naam: 'Testmakelaardij', logoUrl: opties.logoUrl ?? null, kleur: '#0080C8' },
    makelaarNaam: 'Test Makelaar',
    opgesteldOp: '2026-09-18T10:00:00.000Z',
  }) as React.ReactElement<ReactPDF.DocumentProps>)
}

/** Aantal pagina's uit de /Count van de pagina-boom. */
function paginas(pdf: Buffer): number {
  const match = /\/Count\s+(\d+)/.exec(pdf.toString('latin1'))
  return match ? Number(match[1]) : 0
}

describe('WaardebepalingPdfTemplate', () => {
  it('rendert een geldige pdf van één pagina', async () => {
    const pdf = await maakPdf()
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(paginas(pdf)).toBe(1)
  })

  it('blijft één pagina met een makelaarscorrectie erbij', async () => {
    // De correctie is het langste variabele blok (vrije motivatietekst); als iets
    // de pdf over twee pagina's duwt, dan dit.
    const pdf = await maakPdf({
      correctie: {
        waarde: 755000,
        motivatie: 'De woning is recent volledig gerenoveerd met een nieuwe keuken, badkamer en dakisolatie. '
          + 'Daarnaast is de tuin op het zuiden gelegen en dieper dan bij de referenties in deze straat gebruikelijk is. '
          + 'Op basis daarvan ligt de vraagprijs hoger dan de rekenkundige indicatie.',
        datum: '2026-09-18',
      },
    })
    expect(paginas(pdf)).toBe(1)
  })
})
