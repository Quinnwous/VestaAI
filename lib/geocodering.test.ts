import { describe, expect, it } from 'vitest'
import { beoordeelTreffer, bouwPdokQuery, kiesBesteTreffer, naarGeoWkt } from './geocodering'

describe('bouwPdokQuery', () => {
  it('bouwt een gestructureerde query als postcode + huisnummer bekend zijn', () => {
    expect(bouwPdokQuery({ postcode: '2242 GJ', huisnummer: 12, adres: 'Dorpsstraat 12', plaats: 'Wassenaar' }))
      .toEqual({ q: 'postcode:2242GJ and huisnummer:12', fq: 'type:adres' })
  })

  it('laat de toevoeging uit de query (huisletter vs. toevoeging kiest kiesBesteTreffer)', () => {
    expect(bouwPdokQuery({ postcode: '2242gj', huisnummer: 12, toevoeging: 'A', adres: 'Dorpsstraat 12 A', plaats: 'Wassenaar' }))
      .toEqual({ q: 'postcode:2242GJ and huisnummer:12', fq: 'type:adres' })
  })

  it('valt terug op straat + huisnummer + plaats als vrije tekst zonder postcode', () => {
    expect(bouwPdokQuery({ postcode: null, huisnummer: 12, adres: 'Dorpsstraat 12', plaats: 'Wassenaar' }))
      .toEqual({ q: 'Dorpsstraat 12 Wassenaar', fq: 'type:adres' })
  })

  it('haalt de straatnaam uit een adrestekst met toevoeging voor de vrije-tekst-query', () => {
    expect(bouwPdokQuery({ huisnummer: 12, adres: 'Dorpsstraat 12 A', plaats: 'Wassenaar' }))
      .toEqual({ q: 'Dorpsstraat 12 Wassenaar', fq: 'type:adres' })
  })

  it('geeft null zonder postcode, huisnummer of plaats om zinvol op te zoeken', () => {
    expect(bouwPdokQuery({ adres: 'Dorpsstraat 12', plaats: null })).toBeNull()
    expect(bouwPdokQuery({ postcode: null, huisnummer: null, adres: 'Dorpsstraat', plaats: 'Wassenaar' })).toBeNull()
    expect(bouwPdokQuery({})).toBeNull()
  })
})

describe('beoordeelTreffer', () => {
  const RIJ = { postcode: '2242 GJ', huisnummer: 12, adres: 'Dorpsstraat 12', plaats: 'Wassenaar' }

  it('is exact als postcode én huisnummer overeenkomen', () => {
    const uitkomst = beoordeelTreffer(RIJ, {
      centroide_ll: 'POINT(4.402 52.144)',
      postcode: '2242GJ',
      huisnummer: 12,
      straatnaam: 'Dorpsstraat',
      woonplaatsnaam: 'Wassenaar',
      wijknaam: 'Centrum',
      buurtnaam: 'Dorp',
    })
    expect(uitkomst).toEqual({ status: 'exact', lat: 52.144, lng: 4.402, wijk: 'Centrum', buurt: 'Dorp' })
  })

  it('is exact ongeacht spaties/hoofdletters in de postcode', () => {
    const uitkomst = beoordeelTreffer(RIJ, {
      centroide_ll: 'POINT(4.402 52.144)',
      postcode: '2242 gj',
      huisnummer: '12',
    })
    expect(uitkomst.status).toBe('exact')
  })

  it('is benaderd bij een treffer op straat + plaats met een ander huisnummer', () => {
    const uitkomst = beoordeelTreffer(RIJ, {
      centroide_ll: 'POINT(4.402 52.144)',
      postcode: '2242GJ',
      huisnummer: 14, // ander nummer dan de rij
      straatnaam: 'Dorpsstraat',
      woonplaatsnaam: 'Wassenaar',
    })
    expect(uitkomst.status).toBe('benaderd')
  })

  it('is benaderd bij een treffer op straat + plaats zonder postcode om te vergelijken', () => {
    const zonderPostcode = { huisnummer: 12, adres: 'Dorpsstraat 12', plaats: 'Wassenaar' }
    const uitkomst = beoordeelTreffer(zonderPostcode, {
      centroide_ll: 'POINT(4.402 52.144)',
      straatnaam: 'Dorpsstraat',
      woonplaatsnaam: 'Wassenaar',
    })
    expect(uitkomst.status).toBe('benaderd')
  })

  it('is mislukt zonder treffer', () => {
    expect(beoordeelTreffer(RIJ, null)).toEqual({ status: 'mislukt', lat: null, lng: null, wijk: null, buurt: null })
  })

  it('is mislukt bij een treffer zonder coördinaat', () => {
    expect(beoordeelTreffer(RIJ, { postcode: '2242GJ', huisnummer: 12 })).toEqual({
      status: 'mislukt', lat: null, lng: null, wijk: null, buurt: null,
    })
  })

  it('is mislukt als straat en plaats niet overeenkomen (verkeerde treffer)', () => {
    const uitkomst = beoordeelTreffer(RIJ, {
      centroide_ll: 'POINT(4.9 52.37)',
      postcode: '1234AB',
      huisnummer: 99,
      straatnaam: 'Prinsengracht',
      woonplaatsnaam: 'Amsterdam',
    })
    expect(uitkomst.status).toBe('mislukt')
  })
})

describe('naarGeoWkt', () => {
  it('schrijft lng vóór lat, zoals lib/transactieImport.ts', () => {
    expect(naarGeoWkt(52.144, 4.402)).toBe('POINT(4.402 52.144)')
  })
})

describe('kiesBesteTreffer', () => {
  const zonder = { postcode: '2242GJ', huisnummer: 12, centroide_ll: 'POINT(4.1 52.1)' }
  const letterA = { ...zonder, huisletter: 'A', centroide_ll: 'POINT(4.2 52.2)' }
  const toevoeging2 = { ...zonder, huisnummertoevoeging: '2', centroide_ll: 'POINT(4.3 52.3)' }
  const docs = [zonder, letterA, toevoeging2]

  it('kiest de huisletter die bij de toevoeging van de rij past', () => {
    expect(kiesBesteTreffer({ toevoeging: 'a' }, docs)).toBe(letterA)
  })
  it('kiest een echte huisnummertoevoeging', () => {
    expect(kiesBesteTreffer({ toevoeging: '-2' }, docs)).toBe(toevoeging2)
  })
  it('zonder toevoeging: het adres zonder letter', () => {
    expect(kiesBesteTreffer({ toevoeging: null }, [letterA, zonder])).toBe(zonder)
  })
  it('valt terug op de eerste treffer als niets past, en null zonder treffers', () => {
    expect(kiesBesteTreffer({ toevoeging: 'Z' }, docs)).toBe(zonder)
    expect(kiesBesteTreffer({}, [])).toBeNull()
  })
})
