import { describe, it, expect } from 'vitest'
import { deflateSync } from 'node:zlib'
import { isGroen, hexNaarRgb, groenenUitBron, vestaGroenen, pdfKleurBevindingen } from './vestaGroen.mjs'

describe('isGroen', () => {
  it('herkent VestaAI-groen en de groen getinte grijzen', () => {
    for (const h of ['#1A6B45', '#2A8A5C', '#EAF5EE', '#C7E6D5', '#E9EFEB', '#9AA6A0']) {
      expect(isGroen(hexNaarRgb(h)), h).toBe(true)
    }
  })
  it('laat kleurloos grijs, i4-blauw en i4-rood met rust', () => {
    for (const h of ['#FAFBFB', '#5C6470', '#E6E9EC', '#0080C8', '#C61E45', '#D97706', '#0E1A13']) {
      expect(isGroen(hexNaarRgb(h)), h).toBe(false)
    }
  })
})

describe('groenenUitBron / vestaGroenen', () => {
  it('haalt alleen groene hexkleuren uit broncode', () => {
    expect(groenenUitBron("primary: 'var(--merk, #1A6B45)', text: '#14181B', blauw: '#0080C8'")).toEqual(['#1A6B45'])
  })
  it('bevat de tokens-fallbacks en de Tailwind blue-remap', () => {
    const g: string[] = vestaGroenen()
    expect(g).toContain('26, 107, 69') // #1A6B45
    expect(g).toContain('76, 175, 128') // #4CAF80 (blue-400)
  })
})

describe('pdfKleurBevindingen', () => {
  const pdfMet = (content: string, meta = '') => {
    const stream = deflateSync(Buffer.from(content, 'latin1'))
    return Buffer.concat([
      Buffer.from(`%PDF-1.3\n1 0 obj\n<< ${meta} >>\nendobj\n2 0 obj\n<< /Filter /FlateDecode >>\nstream\n`, 'latin1'),
      stream,
      Buffer.from('\nendstream\nendobj\n%%EOF', 'latin1'),
    ])
  }
  it('vindt een groene vulkleur in een gecomprimeerde stream', () => {
    const r = pdfKleurBevindingen(pdfMet('0.10196 0.41961 0.27059 rg 0 0 10 10 re f'), ['26, 107, 69'])
    expect(r.groen).toEqual(['rgb(26, 107, 69)'])
  })
  it('laat merkblauw en zwart met rust', () => {
    const r = pdfKleurBevindingen(pdfMet('0 0.50196 0.78431 rg 0 0 0 RG'), ['26, 107, 69'])
    expect(r.groen).toEqual([])
  })
  it('meldt VestaAI in de metadata', () => {
    const r = pdfKleurBevindingen(pdfMet('', '/Title (Waardebepaling) /Creator (VestaAI)'), [])
    expect(r.naam).toHaveLength(1)
  })
})
