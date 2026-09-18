/**
 * Pure optie-opbouw voor de woningtype-Select in de intake (item 3.2, zie
 * docs/roadmap.md § 5 fase 3.2 en components/PropertyForm.tsx). Los van React
 * — makkelijk te testen, zie woningtypeOpties.test.ts.
 *
 * De Select toont per groep een optgroup met de subtypes uit de taxonomie
 * (docs/ontwerp/README.md § 5, via lib/transactieNormalisatie.ts
 * `woningtypeTaxonomie()`) plus een "<groep> (overig)" optie voor wanneer
 * alleen de groep bekend is. Een los `<select>`-element heeft één
 * stringwaarde nodig, dus groep+sub worden hier samen gecodeerd
 * (`woningtypeOptieWaarde`) en teruggelezen (`ontleedWoningtypeOptieWaarde`).
 */
import { typegroepLabel, type Typegroep } from './schemas'
import { woningtypeTaxonomie } from './transactieNormalisatie'

export type WoningtypeOptie = {
  waarde: string
  label: string
  groep: Typegroep
  sub: string | null
}

export type WoningtypeOptieGroep = {
  groep: Typegroep
  label: string
  opties: WoningtypeOptie[]
}

/** Codeert groep(+sub) naar de stringwaarde die het `<select>`-element gebruikt. */
export function woningtypeOptieWaarde(groep: Typegroep, sub?: string | null): string {
  return sub ? `${groep}:${sub}` : groep
}

/** Inverse van `woningtypeOptieWaarde` — leest een select-waarde terug naar groep+sub. */
export function ontleedWoningtypeOptieWaarde(waarde: string): { groep: Typegroep; sub: string | null } {
  const scheiding = waarde.indexOf(':')
  if (scheiding === -1) return { groep: waarde as Typegroep, sub: null }
  return { groep: waarde.slice(0, scheiding) as Typegroep, sub: waarde.slice(scheiding + 1) }
}

/**
 * Bouwt de optgroup-structuur voor de woningtype-Select: per groep eerst de
 * subtypes uit de taxonomie, dan "<groep> (overig)" voor alleen de groep.
 */
export function bouwWoningtypeOptieGroepen(): WoningtypeOptieGroep[] {
  return woningtypeTaxonomie().map(({ groep, subs }) => {
    const label = typegroepLabel(groep)
    const opties: WoningtypeOptie[] = subs.map(sub => ({
      waarde: woningtypeOptieWaarde(groep, sub),
      label: sub,
      groep,
      sub,
    }))
    opties.push({
      waarde: woningtypeOptieWaarde(groep),
      label: `${label} (overig)`,
      groep,
      sub: null,
    })
    return { groep, label, opties }
  })
}
