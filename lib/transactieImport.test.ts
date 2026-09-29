import { describe, it, expect } from 'vitest'
import { parseCsv } from './transactieImport'

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
