import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractDocxText } from './docx'

// Synthetische fixture (geen klantdata, zie lib/__fixtures__/README.md voor hoe hij
// is opgebouwd), dus deze test draait altijd mee — geen skip meer zoals toen de fixture
// nog het echte (niet-gecommitte) klantdocument `docs/Concurrentieanalyse-HousApp.docx` was.
const FIXTURE = join(process.cwd(), 'lib/__fixtures__/voorbeeld.docx')

describe('extractDocxText', () => {
  it('haalt kop, alinea’s, tabelcellen en bijzondere tekens uit een .docx', async () => {
    const buffer = readFileSync(FIXTURE)
    const tekst = await extractDocxText(buffer)

    // Kop
    expect(tekst).toContain('Voorbeeldkop voor testfixture')

    // Alinea's
    expect(tekst).toContain(
      'Eerste alinea met bijzondere tekens: café, klëine, € 1.234,56 en de plaatsnaam \'s-Gravenhage.',
    )
    expect(tekst).toContain(
      'Tweede alinea om te bewijzen dat meerdere paragrafen na elkaar worden opgehaald door extractDocxText.',
    )

    // Tabelcellen
    expect(tekst).toContain('Plaats')
    expect(tekst).toContain('Vraagprijs')
    expect(tekst).toContain('€ 450.000')

    // Bijzondere tekens (nogmaals los getoetst, zodat een encoding-regressie
    // direct zichtbaar is, ook als de bredere zinnen hierboven per ongeluk
    // zouden worden aangepast)
    expect(tekst).toContain('é')
    expect(tekst).toContain('ë')
    expect(tekst).toContain('€')
    expect(tekst).toContain('\'s-Gravenhage')
  })
})
