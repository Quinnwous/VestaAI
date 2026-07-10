import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractDocxText } from './docx'

// Gebruikt een echt .docx-bestand uit de repo als fixture, zodat we bewijzen dat de
// extractie werkelijke Word-inhoud oplevert (geen mock).
describe('extractDocxText', () => {
  it('haalt bruikbare platte tekst uit een echt .docx-bestand', async () => {
    const buffer = readFileSync(
      join(process.cwd(), 'docs/Concurrentieanalyse-HousApp.docx'),
    )
    const tekst = await extractDocxText(buffer)
    expect(tekst.length).toBeGreaterThan(1000)
    expect(tekst).toContain('HousApp')
  })
})
