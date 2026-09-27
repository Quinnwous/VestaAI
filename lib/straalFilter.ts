/**
 * Pure filterlogica voor de straal-uitsnede rond een woningadres (item 7.3,
 * docs/roadmap.md § Fase 7 — laag "Eigen verkopen" van de dossierkaart; de referentiekaart in de
 * waardering gebruikt dezelfde afstandsberekening via lib/waardering.ts).
 * Los van React/MapLibre, dus met vitest te testen (lib/straalFilter.test.ts).
 * Transacties zonder coördinaten worden overgeslagen — die kunnen sowieso
 * niet op de kaart getoond worden.
 */
import { afstandMeters } from './geo'

export type MetCoordinaten = { lat: number | null; lng: number | null }

/**
 * Filtert `punten` op afstand tot `centrum` (in meters) en sorteert het
 * resultaat op afstand, dichtstbij eerst. Voegt `afstandM` toe zodat de
 * aanroeper de afstand kan tonen zonder opnieuw te berekenen.
 */
export function filterBinnenStraal<T extends MetCoordinaten>(
  punten: T[],
  centrum: [number, number],
  straalM: number,
): (T & { afstandM: number })[] {
  const resultaat: (T & { afstandM: number })[] = []
  for (const p of punten) {
    if (p.lat === null || p.lng === null) continue
    const afstandM = afstandMeters(centrum, [p.lat, p.lng])
    if (afstandM <= straalM) resultaat.push({ ...p, afstandM })
  }
  return resultaat.sort((a, b) => a.afstandM - b.afstandM)
}
