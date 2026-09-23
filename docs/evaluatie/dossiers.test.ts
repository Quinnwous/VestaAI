import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { PropertyInputSchema } from '../../lib/schemas'

/**
 * Valideert de 5 evaluatiedossiers (item 8.1, docs/roadmap.md § 3.6) tegen
 * `PropertyInputSchema` — dit zijn de vaste testwoningen waarmee
 * `scripts/evalueer-content.mjs` de blinde A/B-vergelijking tussen CONTENT en
 * CONTENT_KANDIDAAT draait. Ongeldige fixtures zouden de evaluatieronde pas
 * bij het echt draaien (dure API-calls) laten struikelen — deze test vangt
 * dat gratis en vooraf af.
 */

const DOSSIERS_DIR = join(__dirname, 'dossiers')

function laadDossiers(): { bestand: string; data: unknown }[] {
  return readdirSync(DOSSIERS_DIR)
    .filter(naam => naam.endsWith('.json'))
    .sort()
    .map(bestand => ({ bestand, data: JSON.parse(readFileSync(join(DOSSIERS_DIR, bestand), 'utf8')) }))
}

describe('docs/evaluatie/dossiers — geldige PropertyInputSchema-invoer', () => {
  const dossiers = laadDossiers()

  it('bevat precies 5 dossiers', () => {
    expect(dossiers).toHaveLength(5)
  })

  it.each(laadDossiers())('$bestand is geldige PropertyInput-invoer', ({ data }) => {
    expect(() => PropertyInputSchema.parse(data)).not.toThrow()
  })

  it('elk dossier heeft usps én doelgroep gevuld (vereist om de contentsuite te draaien)', () => {
    for (const { bestand, data } of dossiers) {
      const parsed = PropertyInputSchema.parse(data) as { usps?: string; doelgroep?: string }
      expect(parsed.usps, `${bestand}: usps ontbreekt`).toBeTruthy()
      expect(parsed.doelgroep, `${bestand}: doelgroep ontbreekt`).toBeTruthy()
    }
  })

  it('elk dossier heeft een vraagprijs (geen kale prijsverwachting_verkoper)', () => {
    for (const { bestand, data } of dossiers) {
      const parsed = PropertyInputSchema.parse(data) as { vraagprijs?: number }
      expect(parsed.vraagprijs, `${bestand}: vraagprijs ontbreekt`).toBeGreaterThan(0)
    }
  })

  it('de vijf dossiers dekken uiteenlopende woningtype_groep-waarden', () => {
    const groepen = new Set(dossiers.map(({ data }) => (data as { woningtype_groep: string }).woningtype_groep))
    expect(groepen.size).toBeGreaterThanOrEqual(3)
  })
})
