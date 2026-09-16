import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractDocxText } from './docx'

// Gebruikt een echt .docx-bestand als fixture, zodat we bewijzen dat de extractie
// werkelijke Word-inhoud oplevert (geen mock). Het bestand staat niet in git (klantdata),
// dus zonder fixture slaan we de test over in plaats van de hele suite rood te maken.
const FIXTURE = join(process.cwd(), 'docs/Concurrentieanalyse-HousApp.docx')

describe.skipIf(!existsSync(FIXTURE))('extractDocxText', () => {
  it('haalt bruikbare platte tekst uit een echt .docx-bestand', async () => {
    const buffer = readFileSync(FIXTURE)
    const tekst = await extractDocxText(buffer)
    expect(tekst.length).toBeGreaterThan(1000)
    expect(tekst).toContain('HousApp')
  })
})
