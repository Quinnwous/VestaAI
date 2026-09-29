import type { KantoorInstellingen } from './schemas'

/**
 * Courtage: kantoorstandaard (`instellingen_json.courtage`, platform-admin-
 * beheerd via app/admin/kantoor/InstellingenForm.tsx), per dossier aanpasbaar
 * via het courtagevoorstel in stap 6 van de intake (besluit Quinn 28 sep
 * 2026, docs/specs/j2-courtage-per-dossier.md). Voedt straks het
 * verkoopadvies (fase 11).
 */

export type EffectieveCourtage = {
  /** `null` als noch het dossier, noch het kantoor een percentage heeft. */
  percentage: number | null
  /** Btw-behandeling — ontbreekt de kantoorinstelling, dan `'exclusief'` (NL-gewoonte). */
  btw: 'exclusief' | 'inclusief'
  /** Waar het percentage vandaan komt — `null` als er geen percentage is. */
  bron: 'dossier' | 'kantoor' | null
}

/**
 * Het courtagevoorstel van dit dossier wint van de kantoorstandaard; is er
 * geen dossiervoorstel, dan valt het terug op de kantoorstandaard. De
 * btw-aanduiding komt altijd van het kantoor (er is geen btw-veld per
 * dossier).
 */
export function effectieveCourtage(
  dossierVoorstel: number | null | undefined,
  kantoorInstellingen: KantoorInstellingen | null | undefined,
): EffectieveCourtage {
  const btw = kantoorInstellingen?.courtage?.btw ?? 'exclusief'

  if (dossierVoorstel != null) {
    return { percentage: dossierVoorstel, btw, bron: 'dossier' }
  }

  const kantoorPercentage = kantoorInstellingen?.courtage?.percentage
  if (kantoorPercentage != null) {
    return { percentage: kantoorPercentage, btw, bron: 'kantoor' }
  }

  return { percentage: null, btw, bron: null }
}

/** `1,00 %` — nl-NL-opmaak, altijd twee decimalen (zie lib/opmaak.ts voor de rest van het getalformat). */
export function courtagePercentageLabel(percentage: number): string {
  return percentage.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %'
}

/** `1,00 % excl. btw` — `—` als er geen percentage bekend is. */
export function courtageLabel(courtage: EffectieveCourtage): string {
  if (courtage.percentage == null) return '—'
  const btwLabel = courtage.btw === 'inclusief' ? 'incl. btw' : 'excl. btw'
  return `${courtagePercentageLabel(courtage.percentage)} ${btwLabel}`
}

/**
 * Parseert een optioneel getalveld uit een formulier: een leeg veld levert
 * `undefined` op, nooit `NaN` — anders laat de optionele Zod-validatie het
 * veld alsnog falen. Zelfde patroon als `prijsverwachting_verkoper`/
 * `woz_waarde` in components/PropertyForm.tsx, hier als pure, testbare
 * functie voor het courtageveld (`register('courtagevoorstel_percentage',
 * { setValueAs: parseOptioneelGetal })`).
 */
export function parseOptioneelGetal(waarde: unknown): number | undefined {
  return waarde === '' || waarde === null || waarde === undefined ? undefined : Number(waarde)
}
