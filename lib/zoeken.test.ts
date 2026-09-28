import { describe, expect, it } from 'vitest'
import {
  normaliseer,
  matchType,
  rangschikOpTekst,
  rangschikWoningen,
  faseLabel,
  zoekPaginas,
  toonTransactieSnelkoppeling,
  transactiesZoekHref,
  type ZoekPaginaItem,
  type ZoekWoning,
} from './zoeken'

describe('normaliseer', () => {
  it('zet om naar kleine letters en trimt', () => {
    expect(normaliseer('  Herengracht  ')).toBe('herengracht')
  })

  it('strijkt accenten glad', () => {
    expect(normaliseer('Café')).toBe('cafe')
  })

  it('vouwt dubbele spaties samen', () => {
    expect(normaliseer('Van   der  Berg')).toBe('van der berg')
  })
})

describe('matchType', () => {
  it('geeft exact voor een identieke (genormaliseerde) tekst', () => {
    expect(matchType('kantoor', 'Kantoor')).toBe('exact')
  })

  it('geeft prefix als de tekst met de zoekterm begint', () => {
    expect(matchType('heren', 'Herengracht 1')).toBe('prefix')
  })

  it('geeft contains als de zoekterm ergens middenin staat', () => {
    expect(matchType('gracht', 'Herengracht 1')).toBe('contains')
  })

  it('geeft null zonder match', () => {
    expect(matchType('xyz', 'Herengracht 1')).toBeNull()
  })

  it('geeft null voor een lege zoekterm', () => {
    expect(matchType('', 'Herengracht 1')).toBeNull()
    expect(matchType('   ', 'Herengracht 1')).toBeNull()
  })

  it('is ongevoelig voor accenten aan beide kanten', () => {
    expect(matchType('cafe', 'Café Straat')).toBe('prefix')
  })
})

describe('rangschikOpTekst', () => {
  const items = ['Herengracht 100', 'Heren van Wassenaar', 'Prinsengracht 1', 'Achtergracht 9']

  it('sluit niet-matchende items uit', () => {
    expect(rangschikOpTekst(items, 'xyz', t => t)).toEqual([])
  })

  it('geeft niets terug bij een lege zoekterm', () => {
    expect(rangschikOpTekst(items, '', t => t)).toEqual([])
  })

  it('zet exact vóór prefix vóór contains', () => {
    const resultaat = rangschikOpTekst(['Prinsengracht', 'Gracht', 'Prinsengracht 1'], 'gracht', t => t)
    // 'Gracht' is exact, 'Prinsengracht'/'Prinsengracht 1' bevatten het alleen.
    expect(resultaat[0]).toBe('Gracht')
  })

  it('rangschikt prefix-matches vóór contains-matches', () => {
    const resultaat = rangschikOpTekst(items, 'heren', t => t)
    expect(resultaat[0]).toBe('Herengracht 100') // prefix
    expect(resultaat[1]).toBe('Heren van Wassenaar') // prefix, langer
    expect(resultaat).not.toContain('Prinsengracht 1')
  })

  it('geeft bij gelijke rang de kortste tekst eerst', () => {
    const resultaat = rangschikOpTekst(['Gracht 12345', 'Gracht 1'], 'gracht', t => t)
    expect(resultaat[0]).toBe('Gracht 1')
  })
})

describe('faseLabel', () => {
  it('vertaalt elke ObjectFase naar het label uit AppTopbar/DossierHeader', () => {
    expect(faseLabel('verkoopadvies')).toBe('Verkoopadvies')
    expect(faseLabel('in_verkoop')).toBe('In verkoop')
    expect(faseLabel('verkocht')).toBe('Verkocht')
  })
})

describe('rangschikWoningen', () => {
  const woningen: ZoekWoning[] = [
    { id: '1', adres: 'Herengracht 100', fase: 'in_verkoop' },
    { id: '2', adres: 'Prinsengracht 1', fase: 'verkoopadvies' },
    { id: '3', adres: 'Heren van Wassenaarplein 4', fase: 'verkocht' },
  ]

  it('rangschikt op adres, prefix vóór contains', () => {
    const resultaat = rangschikWoningen(woningen, 'heren')
    expect(resultaat.map(w => w.id)).toEqual(['1', '3'])
  })

  it('geeft niets terug zonder match', () => {
    expect(rangschikWoningen(woningen, 'nergens')).toEqual([])
  })
})

describe('zoekPaginas', () => {
  const paginas: ZoekPaginaItem[] = [
    { id: 'a', label: 'Marktanalyse', href: '/marktanalyse' },
    { id: 'b', label: 'Transacties', href: '/marktanalyse/transacties', aliassen: ['transacties opzoeken'] },
    { id: 'c', label: 'Kantoor', href: '/kantoor' },
  ]

  it('geeft niets terug bij een lege zoekterm', () => {
    expect(zoekPaginas('', paginas)).toEqual([])
  })

  it('matcht op het label', () => {
    expect(zoekPaginas('kantoor', paginas).map(p => p.id)).toEqual(['c'])
  })

  it('matcht ook op een alias', () => {
    expect(zoekPaginas('opzoeken', paginas).map(p => p.id)).toEqual(['b'])
  })

  it('rangschikt een prefix-match op het label vóór een contains-match', () => {
    // 'markt' is prefix van 'Marktanalyse'; geen van de andere twee matcht.
    expect(zoekPaginas('markt', paginas).map(p => p.id)).toEqual(['a'])
  })

  it('gebruikt de standaard ZOEK_PAGINAS als er geen lijst wordt meegegeven', () => {
    expect(zoekPaginas('verkoopkaart').length).toBeGreaterThan(0)
  })
})

describe('toonTransactieSnelkoppeling', () => {
  it('is false onder de minimale lengte', () => {
    expect(toonTransactieSnelkoppeling('h')).toBe(false)
    expect(toonTransactieSnelkoppeling(' ')).toBe(false)
  })

  it('is true vanaf de minimale lengte', () => {
    expect(toonTransactieSnelkoppeling('he')).toBe(true)
  })
})

describe('transactiesZoekHref', () => {
  it('zet de zoekterm in het zoek-queryparam', () => {
    expect(transactiesZoekHref('Herengracht 1')).toBe('/marktanalyse/transacties?zoek=Herengracht+1')
  })

  it('trimt de zoekterm', () => {
    expect(transactiesZoekHref('  Prinsengracht  ')).toBe('/marktanalyse/transacties?zoek=Prinsengracht')
  })
})
