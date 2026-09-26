import { describe, it, expect } from 'vitest'
import { PropertyInputSchema, woningtypeLabel, HuisstijlSchema, TekstsjabloonSchema } from './schemas'

const BASIS = {
  adres: 'Herengracht 1, Amsterdam',
  kamers: 3,
  oppervlak_m2: 85,
  bouwjaar: 1920,
  energielabel: 'C',
}

describe('PropertyInputSchema — woningtype-migratie (item 3.2)', () => {
  // Oude 6-waarden-enum (vóór item 3.2) → nieuwe groep+subtype-vorm, via
  // dezelfde taxonomie-mapping als lib/transactieNormalisatie.ts.
  const OUDE_WAARDEN: { oud: string; groep: string; sub: string | null }[] = [
    { oud: 'Appartement', groep: 'appartement', sub: null },
    { oud: 'Tussenwoning', groep: 'rijwoning', sub: 'Tussenwoning' },
    { oud: 'Hoekwoning', groep: 'rijwoning', sub: 'Hoekwoning' },
    { oud: 'Vrijstaand', groep: 'vrijstaand', sub: 'Vrijstaande woning' },
    { oud: 'Villa', groep: 'vrijstaand', sub: 'Villa' },
    { oud: 'Penthouse', groep: 'appartement', sub: 'Penthouse' },
  ]

  it.each(OUDE_WAARDEN)('migreert de oude waarde "$oud" naar groep $groep / sub $sub', ({ oud, groep, sub }) => {
    const geparsed = PropertyInputSchema.parse({ ...BASIS, woningtype: oud })
    expect(geparsed.woningtype_groep).toBe(groep)
    expect(geparsed.woningtype_sub ?? null).toBe(sub)
    // het oude platte veld verdwijnt uit de output
    expect((geparsed as Record<string, unknown>).woningtype).toBeUndefined()
  })

  it('laat de nieuwe vorm (woningtype_groep + woningtype_sub) ongewijzigd', () => {
    const geparsed = PropertyInputSchema.parse({ ...BASIS, woningtype_groep: 'rijwoning', woningtype_sub: 'Hoekwoning' })
    expect(geparsed.woningtype_groep).toBe('rijwoning')
    expect(geparsed.woningtype_sub).toBe('Hoekwoning')
  })

  it('laat de nieuwe vorm zonder subtype ongewijzigd (alleen groep bekend)', () => {
    const geparsed = PropertyInputSchema.parse({ ...BASIS, woningtype_groep: 'appartement' })
    expect(geparsed.woningtype_groep).toBe('appartement')
    expect(geparsed.woningtype_sub).toBeUndefined()
  })

  it('geeft voorrang aan de nieuwe vorm als beide velden aanwezig zijn', () => {
    const geparsed = PropertyInputSchema.parse({ ...BASIS, woningtype: 'Villa', woningtype_groep: 'appartement' })
    expect(geparsed.woningtype_groep).toBe('appartement')
  })

  it('faalt bij een onbekende woningtype_groep', () => {
    expect(() => PropertyInputSchema.parse({ ...BASIS, woningtype_groep: 'iglo' })).toThrow()
  })

  it('faalt zonder woningtype_groep en zonder herkenbaar oud veld', () => {
    expect(() => PropertyInputSchema.parse({ ...BASIS })).toThrow()
  })
})

describe('PropertyInputSchema — usps/doelgroep optioneel (item 3.2, verkoopadviesfase)', () => {
  const MET_GROEP = { ...BASIS, woningtype_groep: 'appartement' as const }

  it('accepteert het volledig ontbreken van usps en doelgroep', () => {
    expect(() => PropertyInputSchema.parse(MET_GROEP)).not.toThrow()
    const geparsed = PropertyInputSchema.parse(MET_GROEP)
    expect(geparsed.usps).toBeUndefined()
    expect(geparsed.doelgroep).toBeUndefined()
  })

  it('accepteert een lege string (ongewijzigd wizard-veld dat nooit is ingevuld)', () => {
    expect(() => PropertyInputSchema.parse({ ...MET_GROEP, usps: '', doelgroep: '' })).not.toThrow()
  })

  it('blijft usps > 500 tekens afwijzen', () => {
    expect(() => PropertyInputSchema.parse({ ...MET_GROEP, usps: 'x'.repeat(501) })).toThrow()
  })
})

describe('woningtypeLabel', () => {
  it('geeft het subtype als dat er is', () => {
    expect(woningtypeLabel({ woningtype_groep: 'vrijstaand', woningtype_sub: 'Villa' })).toBe('Villa')
  })

  it('valt terug op het groepslabel zonder subtype', () => {
    expect(woningtypeLabel({ woningtype_groep: 'rijwoning' })).toBe('Rijwoning')
  })
})

describe('HuisstijlSchema — tekstsjabloon (item 8.2, backcompat)', () => {
  const BASIS_HUISSTIJL = {
    schrijftoon: 'informeel' as const,
    slogan: 'Wonen met een glimlach',
    primaire_kleur: '#0080C8',
    voorbeelden: [],
  }

  it('parset oude huisstijl_json zonder tekstsjabloon-veld ongewijzigd (backcompat)', () => {
    const geparsed = HuisstijlSchema.parse(BASIS_HUISSTIJL)
    expect(geparsed.tekstsjabloon).toBeUndefined()
  })

  it('accepteert een volledig tekstsjabloon inclusief EN-koppen', () => {
    const metSjabloon = {
      ...BASIS_HUISSTIJL,
      tekstsjabloon: {
        opening_label: '4SALE!',
        secties: [
          { kop: 'WOONCOMFORT', instructie: 'Beschrijf de indeling en de keuken.' },
          { kop: 'BUITENLEVEN', instructie: 'Beschrijf tuin en buitenruimte.' },
          { kop: 'LOCATIE', instructie: 'Beschrijf de buurt en bereikbaarheid.' },
          { kop: 'GOED OM TE WETEN', instructie: 'Korte bulletpoints die beginnen met "- ".' },
        ],
        slotzin: 'Enthousiast over deze woning? Neem contact op met ons kantoor. Wij plannen graag een afspraak met je in.',
        doel_woorden: 480,
        engels: {
          opening_label: '4SALE!',
          koppen: ['LIVING COMFORT', 'OUTDOOR LIVING', 'LOCATION', 'GOOD TO KNOW'],
        },
      },
    }
    expect(() => HuisstijlSchema.parse(metSjabloon)).not.toThrow()
    const geparsed = HuisstijlSchema.parse(metSjabloon)
    expect(geparsed.tekstsjabloon?.secties).toHaveLength(4)
    expect(geparsed.tekstsjabloon?.engels?.koppen).toHaveLength(4)
  })

  it('wijst een tekstsjabloon af zonder secties', () => {
    expect(() =>
      TekstsjabloonSchema.parse({
        opening_label: '4SALE!',
        secties: [],
        slotzin: 'Tot ziens.',
        doel_woorden: 480,
      }),
    ).toThrow()
  })

  it('wijst engels.koppen af als het aantal niet overeenkomt met secties', () => {
    expect(() =>
      TekstsjabloonSchema.parse({
        opening_label: '4SALE!',
        secties: [
          { kop: 'WOONCOMFORT', instructie: 'Indeling.' },
          { kop: 'LOCATIE', instructie: 'Buurt.' },
        ],
        slotzin: 'Tot ziens.',
        doel_woorden: 480,
        engels: { opening_label: '4SALE!', koppen: ['LIVING COMFORT'] },
      }),
    ).toThrow()
  })
})
