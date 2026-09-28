// ===========================================================================
// Item 8.4 — de brochure-pdf rendert écht, met en zonder foto's/logo/intro-
// tekst. Zelfde reden als WaardebepalingPdfTemplate.test.ts: react-pdf
// valideert zijn stylesheet pas tijdens het renderen, dus typecheck/build
// zien een kapotte style-prop niet — alleen een echte render vangt dat.
//
// Geen netwerk: foto- en logo-URL's zijn hier plaatjes-loze test-fixtures.
// react-pdf's <Image> laat een niet-bestaande URL falen tijdens het renderen
// (vandaar dat de route ze vooraf met bruikbaarLogo() filtert) — deze test
// gebruikt daarom alleen `null`/lege lijsten om de "geen foto/logo"-paden te
// dekken, niet een dode URL (dat zou de test zelf laten falen, niet de
// productiecode — de generatie-robuustheid zit in de route, niet de template).
// ===========================================================================

import { describe, it, expect, beforeAll } from 'vitest'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import type * as ReactPDF from '@react-pdf/renderer'
import sharp from 'sharp'
import { BrochurePdfTemplate } from './BrochurePdfTemplate'
import type { PropertyInput } from '@/lib/schemas'

// react-pdf's layout-engine (Yoga) meet zelf de intrinsieke afmetingen van een
// <Image> op om de opgegeven style (objectFit: cover, vaste hoogte) toe te
// passen — een 1×1-testpixel geeft daarbij een onbetrouwbare meting ("Node
// of type IMAGE can't wrap between pages"), dus een echte, redelijk
// geproportioneerde foto (4:3, zoals een woningfoto) als test-fixture.
let TESTFOTO: string
beforeAll(async () => {
  const buf = await sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 120, g: 140, b: 160 } } }).png().toBuffer()
  TESTFOTO = `data:image/png;base64,${buf.toString('base64')}`
})

const INVOER: PropertyInput = {
  adres: 'Kerkstraat 1, Wassenaar',
  woningtype_groep: 'rijwoning',
  kamers: 5,
  oppervlak_m2: 120,
  bouwjaar: 1965,
  energielabel: 'C',
  vraagprijs: 795000,
  perceel_m2: 220,
  ligging_buitenruimte: { tuin_m2: 85, garage_parkeren: 'garage', balkon_dakterras: true },
} as unknown as PropertyInput

function maakPdf(opties: {
  introTekst?: string
  fotos?: string[]
  slotTekst?: string | null
  logoUrl?: string | null
  vorm?: 'zacht' | 'strak'
  website?: string | null
} = {}) {
  return renderToBuffer(React.createElement(BrochurePdfTemplate, {
    address: 'Kerkstraat 1, Wassenaar',
    input: INVOER,
    introTekst: opties.introTekst ?? 'Een sfeervolle rijwoning in het hart van Wassenaar, met een zonnige tuin op het zuiden.',
    fotos: opties.fotos ?? [],
    kantoor: {
      naam: 'Testmakelaardij',
      logoUrl: opties.logoUrl ?? null,
      kleur: '#0080C8',
      telefoon: '070 - 123 45 67',
      email: 'info@testmakelaardij.nl',
      website: opties.website ?? null,
    },
    vorm: opties.vorm ?? 'zacht',
    slotTekst: opties.slotTekst ?? null,
    makelaarNaam: 'Test Makelaar',
    opgesteldOp: '2026-09-27T10:00:00.000Z',
  }) as React.ReactElement<ReactPDF.DocumentProps>)
}

/** Aantal pagina's uit de /Count van de pagina-boom. */
function paginas(pdf: Buffer): number {
  const match = /\/Count\s+(\d+)/.exec(pdf.toString('latin1'))
  return match ? Number(match[1]) : 0
}

describe('BrochurePdfTemplate', () => {
  it('rendert een geldige pdf: cover, intro, kenmerken, slot — geen foto\'s', async () => {
    const pdf = await maakPdf()
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    // cover + intro + kenmerken + slot, geen fotopagina zonder foto's
    expect(paginas(pdf)).toBe(4)
  })

  it('voegt één fotopagina toe voor 1–4 foto\'s', async () => {
    const pdf = await maakPdf({ fotos: [TESTFOTO] })
    expect(paginas(pdf)).toBe(5)
  })

  it('voegt twee fotopagina\'s toe voor 5–8 foto\'s', async () => {
    const pdf = await maakPdf({ fotos: Array(6).fill(TESTFOTO) })
    expect(paginas(pdf)).toBe(6)
  })

  it('laat de introsectie weg zonder brochure_tekst/funda_tekst', async () => {
    const pdf = await maakPdf({ introTekst: '' })
    // cover + kenmerken + slot, geen intro
    expect(paginas(pdf)).toBe(3)
  })

  it('rendert zonder logo (valt terug op de kantoornaam) en met een eigen slot_tekst', async () => {
    const pdf = await maakPdf({ logoUrl: null, slotTekst: 'i4 Housing · NVM-makelaar\nMolenplein 2, Wassenaar' })
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(paginas(pdf)).toBe(4)
  })

  it('rendert in de strakke vormtaal', async () => {
    const pdf = await maakPdf({ vorm: 'strak' })
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  })

  it('rendert de slotpagina met website naast telefoon/e-mail', async () => {
    const pdf = await maakPdf({ website: 'i4housing.nl' })
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(paginas(pdf)).toBe(4)
  })
})
