import { describe, it, expect } from 'vitest'
import { parseCsv, parseTransactieCsv } from './transactieImport'

describe('parseCsv', () => {
  it('parseert komma-gescheiden velden', () => {
    const rijen = parseCsv('a,b,c\n1,2,3')
    expect(rijen).toEqual([['a', 'b', 'c'], ['1', '2', '3']])
  })

  it('parseert puntkomma-gescheiden velden', () => {
    const rijen = parseCsv('a;b;c\n1;2;3')
    expect(rijen).toEqual([['a', 'b', 'c'], ['1', '2', '3']])
  })

  it('ondersteunt quoted velden met komma erin', () => {
    const rijen = parseCsv('adres,plaats\n"Kerkstraat 1, achter",Wassenaar')
    expect(rijen[1]).toEqual(['Kerkstraat 1, achter', 'Wassenaar'])
  })

  it('slaat lege regels over', () => {
    const rijen = parseCsv('a,b\n1,2\n\n3,4')
    expect(rijen).toHaveLength(3)
  })
})

describe('parseTransactieCsv', () => {
  const HEADER = 'adres,postcode,plaats,lat,lng,verkoopprijs,verkoopdatum,woningtype,oppervlak,bouwjaar,energielabel,eigen_verkoop'

  it('herkent kolommen via aliassen en zet types correct om', () => {
    const csv = `${HEADER}\nHoofdstraat 1,2242AB,Wassenaar,52.146,4.402,750000,15-03-2026,Vrijstaand,180,1998,B,ja`
    const { rijen, overgeslagen } = parseTransactieCsv(csv)
    expect(overgeslagen).toHaveLength(0)
    expect(rijen).toHaveLength(1)
    const r = rijen[0]
    expect(r.adres).toBe('Hoofdstraat 1')
    expect(r.verkoopprijs).toBe(750000)
    expect(r.verkoopdatum).toBe('2026-03-15')
    expect(r.geo).toBe('POINT(4.402 52.146)')
    expect(r.woonoppervlak_m2).toBe(180)
    expect(r.eigen_verkoop).toBe(true)
  })

  it('slaat rijen zonder adres over in plaats van de hele import te laten falen', () => {
    const csv = `${HEADER}\n,2242AB,Wassenaar,,,750000,,,,,,\nHoofdstraat 2,2242AB,Wassenaar,,,600000,,,,,,`
    const { rijen, overgeslagen } = parseTransactieCsv(csv)
    expect(rijen).toHaveLength(1)
    expect(overgeslagen).toHaveLength(1)
    expect(overgeslagen[0].regel).toBe(2)
  })

  it('laat geo leeg zonder lat/lng, zonder te crashen', () => {
    const csv = 'adres,postcode,verkoopprijs\nHoofdstraat 3,2242AB,500000'
    const { rijen } = parseTransactieCsv(csv)
    expect(rijen[0].geo).toBeNull()
  })

  it('standaard eigen_verkoop = true als de kolom ontbreekt', () => {
    const csv = 'adres,postcode,verkoopprijs\nHoofdstraat 4,2242AB,500000'
    const { rijen } = parseTransactieCsv(csv)
    expect(rijen[0].eigen_verkoop).toBe(true)
  })

  it('herkent eigen_verkoop = false expliciet', () => {
    const csv = 'adres,postcode,verkoopprijs,eigen_verkoop\nHoofdstraat 5,2242AB,500000,nee'
    const { rijen } = parseTransactieCsv(csv)
    expect(rijen[0].eigen_verkoop).toBe(false)
  })

  it('geeft leeg resultaat bij alleen een header, geen crash', () => {
    const { rijen, overgeslagen } = parseTransactieCsv('adres,verkoopprijs')
    expect(rijen).toHaveLength(0)
    expect(overgeslagen).toHaveLength(0)
  })

  it('parseert Nederlandse getalnotatie met duizendtal-punt', () => {
    const csv = 'adres,postcode,verkoopprijs\nHoofdstraat 6,2242AB,"€ 1.250.000"'
    const { rijen } = parseTransactieCsv(csv)
    expect(rijen[0].verkoopprijs).toBe(1250000)
  })

  it('slaat een rij over zonder bruikbare adres-sleutel (geen postcode+huisnummer of straat+huisnummer+plaats)', () => {
    const csv = 'adres,verkoopprijs\nOnbekende Straat zonder nummer,500000'
    const { rijen, overgeslagen } = parseTransactieCsv(csv)
    expect(rijen).toHaveLength(0)
    expect(overgeslagen).toHaveLength(1)
    expect(overgeslagen[0].reden).toMatch(/adres-sleutel/)
  })

  it('vult bron, adres_sleutel, huisnummer/toevoeging en woningtype_groep/_sub op elke geïmporteerde rij', () => {
    const csv = 'adres,postcode,woningtype,verkoopprijs\nDorpsstraat 12 A,2242AB,Tussenwoning,500000'
    const { rijen } = parseTransactieCsv(csv)
    expect(rijen[0].bron).toBe('handmatig')
    expect(rijen[0].adres_sleutel).toBe('2242ab|12|a')
    expect(rijen[0].huisnummer).toBe(12)
    expect(rijen[0].toevoeging).toBe('a')
    expect(rijen[0].woningtype_groep).toBe('rijwoning')
    expect(rijen[0].woningtype_sub).toBe('Tussenwoning')
  })
})
