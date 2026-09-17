import { describe, it, expect } from 'vitest'
import { adresSleutel, parseAdresVrijeTekst, plaatsUitAdres, woningtypeGroep, woningtypeSub } from './transactieNormalisatie'

describe('parseAdresVrijeTekst', () => {
  it('splitst straat, huisnummer zonder toevoeging', () => {
    expect(parseAdresVrijeTekst('Dorpsstraat 12')).toEqual({ straat: 'Dorpsstraat', huisnummer: 12, toevoeging: null })
  })

  it('splitst straat, huisnummer + losse letter-toevoeging', () => {
    expect(parseAdresVrijeTekst('Dorpsstraat 12 A')).toEqual({ straat: 'Dorpsstraat', huisnummer: 12, toevoeging: 'a' })
  })

  it('splitst straat, huisnummer + koppelteken-toevoeging', () => {
    expect(parseAdresVrijeTekst('Dorpsstraat 12-bis')).toEqual({ straat: 'Dorpsstraat', huisnummer: 12, toevoeging: 'bis' })
  })

  it('splitst straat, huisnummer + aaneengeschreven letter-toevoeging', () => {
    expect(parseAdresVrijeTekst('Dorpsstraat 12a')).toEqual({ straat: 'Dorpsstraat', huisnummer: 12, toevoeging: 'a' })
  })

  it('negeert een plaatsnaam na de komma', () => {
    expect(parseAdresVrijeTekst('Dorpsstraat 12, Wassenaar')).toEqual({ straat: 'Dorpsstraat', huisnummer: 12, toevoeging: null })
  })

  it('werkt ook met een straat van meerdere woorden', () => {
    expect(parseAdresVrijeTekst('Van Alkemadelaan 45')).toEqual({ straat: 'Van Alkemadelaan', huisnummer: 45, toevoeging: null })
  })

  it('geeft alleen straat terug zonder herkenbaar huisnummer', () => {
    expect(parseAdresVrijeTekst('Onbekende Straat')).toEqual({ straat: 'Onbekende Straat', huisnummer: null, toevoeging: null })
  })
})

describe('plaatsUitAdres', () => {
  it('pakt de woonplaats uit het BAG-formaat (straat, postcode, plaats)', () => {
    expect(plaatsUitAdres('Dorpsstraat 12, 2243 AB, Wassenaar')).toBe('Wassenaar')
  })

  it('pakt de plaats uit een handmatig adres met twee delen', () => {
    expect(plaatsUitAdres('Dorpsstraat 12, Wassenaar')).toBe('Wassenaar')
  })

  it('geeft null zonder komma (geen plaats bekend)', () => {
    expect(plaatsUitAdres('Dorpsstraat 12')).toBeNull()
  })

  it('geeft null als het laatste deel zelf een postcode is', () => {
    expect(plaatsUitAdres('Dorpsstraat 12, 2243AB')).toBeNull()
  })

  it('geeft null voor leeg/ontbrekend adres', () => {
    expect(plaatsUitAdres('')).toBeNull()
    expect(plaatsUitAdres(null)).toBeNull()
    expect(plaatsUitAdres(undefined)).toBeNull()
  })
})

describe('adresSleutel', () => {
  it('bouwt postcode|huisnummer|toevoeging als postcode + huisnummer bekend zijn', () => {
    expect(adresSleutel({ postcode: '2242 AB', huisnummer: 12, toevoeging: 'A' })).toBe('2242ab|12|a')
  })

  it('laat het toevoeging-segment leeg zonder toevoeging', () => {
    expect(adresSleutel({ postcode: '2242AB', huisnummer: 12 })).toBe('2242ab|12|')
  })

  it('normaliseert postcode-spaties en -hoofdletters, en toevoeging-hoofdletters', () => {
    const a = adresSleutel({ postcode: '2242 AB', huisnummer: 12, toevoeging: 'A' })
    const b = adresSleutel({ postcode: '2242ab', huisnummer: 12, toevoeging: 'a' })
    expect(a).toBe(b)
  })

  it('valt terug op straat|huisnummer|plaats zonder postcode', () => {
    expect(adresSleutel({ straat: 'Dorpsstraat', huisnummer: 12, plaats: 'Wassenaar' })).toBe('dorpsstraat|12|wassenaar')
  })

  it('haalt huisnummer/toevoeging/straat uit een vrije adrestekst als ze niet los zijn aangeleverd', () => {
    expect(adresSleutel({ postcode: '2242AB', adres: 'Dorpsstraat 12 A' })).toBe('2242ab|12|a')
  })

  it('gebruikt de vrije adrestekst ook voor de straat-terugval', () => {
    expect(adresSleutel({ adres: 'Dorpsstraat 12-bis', plaats: 'Wassenaar' })).toBe('dorpsstraat|12|wassenaar')
  })

  it('geeft dezelfde sleutel voor dezelfde woning in verschillende schrijfwijzen', () => {
    const losseVelden = adresSleutel({ postcode: '2242 AB', huisnummer: 12, toevoeging: 'A' })
    const uitVrijeTekst = adresSleutel({ postcode: '2242ab', adres: 'Dorpsstraat 12a' })
    const uitVrijeTekstMetKoppelteken = adresSleutel({ postcode: '2242AB', adres: 'Dorpsstraat 12-A' })
    expect(losseVelden).toBe(uitVrijeTekst)
    expect(losseVelden).toBe(uitVrijeTekstMetKoppelteken)
  })

  it('geeft null als er geen betrouwbare sleutel te maken is', () => {
    expect(adresSleutel({ adres: 'Onbekende Straat zonder nummer' })).toBeNull()
    expect(adresSleutel({})).toBeNull()
  })

  it('geeft null zonder plaats, zelfs met straat + huisnummer, als er geen postcode is', () => {
    expect(adresSleutel({ straat: 'Dorpsstraat', huisnummer: 12 })).toBeNull()
  })
})

describe('woningtypeGroep / woningtypeSub', () => {
  const gevallen: { ruw: string; groep: string; sub: string | null }[] = [
    // Bestaande PropertyInputSchema-enum (lib/schemas.ts)
    { ruw: 'Appartement', groep: 'appartement', sub: null },
    { ruw: 'Tussenwoning', groep: 'rijwoning', sub: 'Tussenwoning' },
    { ruw: 'Hoekwoning', groep: 'rijwoning', sub: 'Hoekwoning' },
    { ruw: 'Vrijstaand', groep: 'vrijstaand', sub: 'Vrijstaande woning' },
    { ruw: 'Villa', groep: 'vrijstaand', sub: 'Villa' },
    { ruw: 'Penthouse', groep: 'appartement', sub: 'Penthouse' },
    // Brainbay/Realworks-achtige waarden
    { ruw: '2-onder-1-kapwoning', groep: 'halfvrijstaand', sub: 'Twee-onder-een-kap' },
    { ruw: 'Twee-onder-een-kapwoning', groep: 'halfvrijstaand', sub: 'Twee-onder-een-kap' },
    { ruw: 'Vrijstaande woning', groep: 'vrijstaand', sub: 'Vrijstaande woning' },
    { ruw: 'Bovenwoning', groep: 'appartement', sub: 'Bovenwoning' },
    { ruw: 'Galerijflat', groep: 'appartement', sub: 'Galerijflat' },
    { ruw: 'Portiekflat', groep: 'appartement', sub: 'Portiekflat' },
    { ruw: 'Eengezinswoning', groep: 'rijwoning', sub: null },
    { ruw: 'Herenhuis', groep: 'rijwoning', sub: 'Herenhuis' },
    { ruw: 'Bungalow', groep: 'vrijstaand', sub: 'Bungalow' },
    { ruw: 'Woonboerderij', groep: 'vrijstaand', sub: 'Woonboerderij' },
  ]

  it.each(gevallen)('mapt "$ruw" naar groep $groep / sub $sub', ({ ruw, groep, sub }) => {
    expect(woningtypeGroep(ruw)).toBe(groep)
    expect(woningtypeSub(ruw)).toBe(sub)
  })

  it('is ongevoelig voor hoofdletters en spaties/koppeltekens', () => {
    expect(woningtypeGroep('  twee-ONDER-een-Kap  ')).toBe('halfvrijstaand')
    expect(woningtypeSub('  twee-ONDER-een-Kap  ')).toBe('Twee-onder-een-kap')
  })

  it('gokt nooit: onbekende waarden geven null', () => {
    expect(woningtypeGroep('Iets geheel onbekends')).toBeNull()
    expect(woningtypeSub('Iets geheel onbekends')).toBeNull()
    expect(woningtypeGroep(null)).toBeNull()
    expect(woningtypeGroep(undefined)).toBeNull()
    expect(woningtypeGroep('')).toBeNull()
  })
})
