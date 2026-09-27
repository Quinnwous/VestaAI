/**
 * Test-fixtures voor de e2e-suite (item 12.2) — minimale, geldige payloads en
 * lookups tegen het demo-kantoor. Bewust geen import van `lib/schemas.ts`
 * (bundelt Next-only code) — de velden hieronder zijn met de hand
 * gesynchroniseerd met `PropertyInputSchema` (lib/schemas.ts): alleen de
 * verplichte velden (adres, woningtype_groep, kamers, oppervlak_m2, bouwjaar,
 * energielabel), plus usps/doelgroep voor de contentgeneratie-test die dat
 * apart eist (lib/contentGeneratie.ts regel "Vul eerst stap Verhaal in").
 */
import { serviceClient } from './session'

let volgnummer = 0

/** Uniek testadres per run — voorkomt botsingen bij een herhaalde/parallelle run. */
export function testAdres(): string {
  volgnummer += 1
  return `Teststraat ${100 + volgnummer}, e2e-${Date.now()}-${volgnummer}, 2242 AB Wassenaar`
}

export function minimalePropertyInput(overrides: Record<string, unknown> = {}) {
  return {
    adres: testAdres(),
    woningtype_groep: 'rijwoning',
    kamers: 4,
    oppervlak_m2: 120,
    bouwjaar: 1985,
    energielabel: 'C',
    ...overrides,
  }
}

export function propertyInputMetVerhaal(overrides: Record<string, unknown> = {}) {
  return minimalePropertyInput({
    usps: 'Rustige straat, veel lichtinval, recent gerenoveerde keuken.',
    doelgroep: 'Jonge gezinnen',
    ...overrides,
  })
}

/**
 * Een dossier in het demo-kantoor, fase Verkoopadvies, met een berekende
 * waardering (`waardering_json.uitkomst`) — zelfde query als
 * `dossierMetWaardering()` in e2e/primitives.spec.ts, hier hergebruikt voor
 * de waarderings-pdf-test (spec 3).
 */
export async function dossierMetWaardering(kantoorId: string): Promise<{ id: string; n: number } | null> {
  const db = serviceClient()
  const { data: objecten } = await db
    .from('objecten')
    .select('id, fase, waardering_json')
    .eq('kantoor_id', kantoorId)
    .limit(50)

  type Rij = { id: string; fase: string; waardering_json: { uitkomst?: { n?: number } } | null }
  const treffer = ((objecten ?? []) as Rij[]).find(
    o => o.waardering_json?.uitkomst && o.fase === 'verkoopadvies',
  )
  if (!treffer?.waardering_json?.uitkomst) return null
  return { id: treffer.id, n: treffer.waardering_json.uitkomst.n ?? 0 }
}
