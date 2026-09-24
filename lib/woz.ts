/**
 * WOZ per woning — handmatig (besluit 24 sep 2026).
 *
 * Er is geen gratis WOZ-API die een commercieel platform mag gebruiken: het
 * WOZ-waardeloket verbiedt geautomatiseerd opvragen, Kadaster "WOZ Bevragen"
 * is alleen voor gemeenten en Huisvestingswet-taken, en woz-api.nl/Altum AI
 * zijn betaald. De makelaar vult de WOZ daarom zelf in — uit de beschikking
 * van de verkoper, of door de woning één keer zelf op te zoeken in het loket
 * (individueel raadplegen mag wél). Opslag in `objecten.input_json`
 * (`woz_waarde` + `woz_peiljaar`), geen migratie.
 */

/** Het loket zelf — de makelaar zoekt het adres daar handmatig op. */
export const WOZ_LOKET_URL = 'https://www.wozwaardeloket.nl/'

/** Dezelfde vorm als het WOZ-ijkpunt in de waardering (§ 3.3): waarde + peildatum. */
export interface WozIjkpunt {
  waarde: number
  peildatum: string
}

/** Het ingevulde WOZ-ijkpunt uit de intake, of `null` als het (nog) ontbreekt. */
export function wozUitInvoer(
  invoer: { woz_waarde?: number | null; woz_peiljaar?: number | null } | null | undefined,
): WozIjkpunt | null {
  if (!invoer?.woz_waarde || !invoer.woz_peiljaar) return null
  return { waarde: invoer.woz_waarde, peildatum: `${invoer.woz_peiljaar}-01-01` }
}

export type WozInvoerResultaat =
  | { ok: true; woz_waarde: number | undefined; woz_peiljaar: number | undefined }
  | { ok: false; fout: string }

/**
 * Valideert wat de makelaar invult. Beide leeg = wissen. Een waarde zonder
 * peiljaar is geen ijkpunt (de peildatum staat altijd naast het bedrag).
 */
export function valideerWozInvoer(waarde: unknown, peiljaar: unknown): WozInvoerResultaat {
  const leeg = (v: unknown) => v === null || v === undefined || v === ''
  if (leeg(waarde) && leeg(peiljaar)) return { ok: true, woz_waarde: undefined, woz_peiljaar: undefined }

  const w = typeof waarde === 'number' ? waarde : Number(waarde)
  const j = typeof peiljaar === 'number' ? peiljaar : Number(peiljaar)
  if (!Number.isInteger(w) || w < 1000 || w > 100_000_000) {
    return { ok: false, fout: 'Vul een WOZ-waarde in hele euro’s in (bijvoorbeeld 845000).' }
  }
  if (!Number.isInteger(j) || j < 2000 || j > 2100) {
    return { ok: false, fout: 'Vul het jaar van de waardepeildatum in (bijvoorbeeld 2025).' }
  }
  return { ok: true, woz_waarde: w, woz_peiljaar: j }
}
