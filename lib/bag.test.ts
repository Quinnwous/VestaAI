import { describe, expect, it } from 'vitest'
import { bagAdressen, bagLabel, bagZoekUrl, naarSuggestie, parseUitgebreid } from './bag'

describe('bagZoekUrl', () => {
  it('zoekt vrije tekst via q met pageSize ≥ 10 (zoekresultaat bestaat niet)', () => {
    const url = new URL(bagZoekUrl('Langstraat 10, 2242KM, Wassenaar'))
    expect(url.pathname).toMatch(/\/adressen$/)
    expect(url.searchParams.get('q')).toBe('Langstraat 10, 2242KM, Wassenaar')
    expect(Number(url.searchParams.get('pageSize'))).toBeGreaterThanOrEqual(10)
    expect(url.searchParams.has('zoekresultaat')).toBe(false)
  })
})

describe('adressen parsen', () => {
  const antwoord = {
    _embedded: {
      adressen: [
        { openbareRuimteNaam: 'Langstraat', huisnummer: 10, postcode: '2242KM', woonplaatsNaam: 'Wassenaar', nummeraanduidingIdentificatie: '0629200000004591', adresseerbaarObjectIdentificatie: '0629010000004591' },
        { openbareRuimteNaam: 'Dam', huisnummer: 1, huisletter: 'A', huisnummertoevoeging: '2', woonplaatsNaam: 'Zuidland' },
      ],
    },
  }

  it('leest de lijst en bouwt labels', () => {
    const lijst = bagAdressen(antwoord)
    expect(lijst).toHaveLength(2)
    expect(bagLabel(lijst[0])).toBe('Langstraat 10, 2242KM, Wassenaar')
    expect(bagLabel(lijst[1])).toBe('Dam 1A-2, Zuidland')
  })

  it('maakt suggesties met id’s (null als ze ontbreken)', () => {
    const [a, b] = bagAdressen(antwoord).map(naarSuggestie)
    expect(a.nummeraanduiding_id).toBe('0629200000004591')
    expect(a.adresseerbaarobject_id).toBe('0629010000004591')
    expect(b.nummeraanduiding_id).toBeNull()
  })

  it('geeft een lege lijst bij een foutantwoord of geen treffers', () => {
    expect(bagAdressen({ status: 400, title: 'Bad request' })).toEqual([])
    expect(bagAdressen({ _links: {} })).toEqual([])
    expect(bagAdressen(null)).toEqual([])
  })
})

describe('parseUitgebreid', () => {
  it('leest bouwjaar (lijst strings) en oppervlakte', () => {
    expect(parseUitgebreid({ oorspronkelijkBouwjaar: ['1910'], oppervlakte: 304 })).toEqual({ bouwjaar: 1910, oppervlak_m2: 304 })
  })

  it('neemt het oudste pand bij meerdere bouwjaren', () => {
    expect(parseUitgebreid({ oorspronkelijkBouwjaar: ['1998', '1932'], oppervlakte: 120 }).bouwjaar).toBe(1932)
  })

  it('negeert onzin (BAG gebruikt 9999 voor onbekend) en ontbrekende velden', () => {
    expect(parseUitgebreid({ oorspronkelijkBouwjaar: ['9999'], oppervlakte: 0 })).toEqual({ bouwjaar: null, oppervlak_m2: null })
    expect(parseUitgebreid({})).toEqual({ bouwjaar: null, oppervlak_m2: null })
  })
})
