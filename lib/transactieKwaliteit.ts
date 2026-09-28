/**
 * Plausibiliteitsregels voor een geïmporteerde transactierij (item 5.2,
 * docs/roadmap.md § Fase 5). Een rij die een van deze regels overtreedt
 * wordt NIET verwijderd — hij krijgt `uitgesloten_reden` gevuld en blijft
 * gewoon opgeslagen, zodat het kwaliteitsrapport hem kan tonen (zie
 * `lib/importPijplijn.ts`). `lib/transactiesQuery.ts` filtert overal al op
 * `uitgesloten_reden is null`, dus zo'n rij doet vanzelf niet mee aan
 * waardering/marktanalyse/concurrentie zonder dat hij uit de dataset
 * verdwijnt (traceerbaar, terug te draaien).
 *
 * Volgorde: verplichte velden eerst (zonder sleutel/prijs/datum is er niets
 * te beoordelen), dan de plausibiliteitsgrenzen. Eén reden per rij — de
 * eerst overtreden regel wint, niet een lijst van alle overtredingen.
 */

export type KwaliteitsRedenCode =
  | 'adres_sleutel_ontbreekt'
  | 'verkoopprijs_ontbreekt'
  | 'verkoopdatum_ontbreekt'
  | 'prijs_onwaarschijnlijk'
  | 'oppervlak_onwaarschijnlijk'
  | 'prijs_per_m2_onwaarschijnlijk'
  | 'bouwjaar_onwaarschijnlijk'
  | 'verkoopdatum_onwaarschijnlijk'

/** NL-label per redencode — voor het kwaliteitsrapport en /admin/transacties. */
export const KWALITEIT_LABELS: Record<KwaliteitsRedenCode, string> = {
  adres_sleutel_ontbreekt: 'Geen adres-sleutel te bepalen',
  verkoopprijs_ontbreekt: 'Verkoopprijs ontbreekt',
  verkoopdatum_ontbreekt: 'Verkoopdatum ontbreekt',
  prijs_onwaarschijnlijk: 'Verkoopprijs buiten het plausibele bereik (€ 50.000 – € 10.000.000)',
  oppervlak_onwaarschijnlijk: 'Woonoppervlak buiten het plausibele bereik (20–1.000 m²)',
  prijs_per_m2_onwaarschijnlijk: 'Prijs per m² buiten het plausibele bereik (€ 500 – € 15.000)',
  bouwjaar_onwaarschijnlijk: 'Bouwjaar onwaarschijnlijk',
  verkoopdatum_onwaarschijnlijk: 'Verkoopdatum onwaarschijnlijk (vóór 2000 of in de toekomst)',
}

export type KwaliteitInvoer = {
  adres_sleutel: string | null | undefined
  verkoopprijs: number | null | undefined
  woonoppervlak_m2?: number | null
  bouwjaar?: number | null
  /** ISO-datum (jjjj-mm-dd of jjjj-mm-ddThh:mm:ss…) */
  verkoopdatum: string | null | undefined
}

const PRIJS_MIN = 50_000
const PRIJS_MAX = 10_000_000
const OPPERVLAK_MIN = 20
const OPPERVLAK_MAX = 1_000
const M2_PRIJS_MIN = 500
const M2_PRIJS_MAX = 15_000
const BOUWJAAR_MIN = 1600
const VERKOOPDATUM_MIN = '2000-01-01'

/**
 * Beoordeelt één transactierij tegen de plausibiliteitsregels. `vandaag`
 * (standaard de systeemdatum) is injecteerbaar zodat de test deterministisch
 * blijft en onafhankelijk is van de dag waarop hij draait.
 */
export function beoordeelTransactie(
  rij: KwaliteitInvoer,
  opties: { vandaag?: Date } = {},
): { uitgesloten_reden: KwaliteitsRedenCode | null } {
  if (!rij.adres_sleutel) return { uitgesloten_reden: 'adres_sleutel_ontbreekt' }
  if (rij.verkoopprijs == null) return { uitgesloten_reden: 'verkoopprijs_ontbreekt' }
  if (!rij.verkoopdatum) return { uitgesloten_reden: 'verkoopdatum_ontbreekt' }

  const vandaag = opties.vandaag ?? new Date()
  const vandaagIso = vandaag.toISOString().slice(0, 10)
  const huidigJaarPlusEen = vandaag.getUTCFullYear() + 1
  const verkoopdatumIso = rij.verkoopdatum.slice(0, 10)

  if (rij.verkoopprijs < PRIJS_MIN || rij.verkoopprijs > PRIJS_MAX) {
    return { uitgesloten_reden: 'prijs_onwaarschijnlijk' }
  }

  if (rij.woonoppervlak_m2 != null && (rij.woonoppervlak_m2 < OPPERVLAK_MIN || rij.woonoppervlak_m2 > OPPERVLAK_MAX)) {
    return { uitgesloten_reden: 'oppervlak_onwaarschijnlijk' }
  }

  if (rij.woonoppervlak_m2) {
    const prijsPerM2 = rij.verkoopprijs / rij.woonoppervlak_m2
    if (prijsPerM2 < M2_PRIJS_MIN || prijsPerM2 > M2_PRIJS_MAX) {
      return { uitgesloten_reden: 'prijs_per_m2_onwaarschijnlijk' }
    }
  }

  if (rij.bouwjaar != null && (rij.bouwjaar < BOUWJAAR_MIN || rij.bouwjaar > huidigJaarPlusEen)) {
    return { uitgesloten_reden: 'bouwjaar_onwaarschijnlijk' }
  }

  if (verkoopdatumIso < VERKOOPDATUM_MIN || verkoopdatumIso > vandaagIso) {
    return { uitgesloten_reden: 'verkoopdatum_onwaarschijnlijk' }
  }

  return { uitgesloten_reden: null }
}
