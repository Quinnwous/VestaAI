/**
 * RD (Rijksdriehoeksstelsel, EPSG:28992) → WGS84 (lat/lng), pure functie
 * zonder afhankelijkheden (fase 5, item 5.2 — Brainbay/Realworks-exports
 * leveren coördinaten soms als RD X/Y i.p.v. lat/lng, zie
 * `lib/importProfielen.ts`). Benaderingsformules van Schreutelkamp/Strang
 * van Hees ("Benaderingsformules voor de transformatie tussen RD- en
 * WGS84-kaartcoördinaten", de standaard polynomiale reeks, nauwkeurigheid
 * < 1 m binnen Nederland) — geen volledige Helmert-transformatie nodig voor
 * dit doel (referentiepunten op een kaart, geen kadastrale nauwkeurigheid).
 *
 * Coëfficiënten geverifieerd tegen meerdere publieke implementaties van
 * dezelfde formule (o.a. thomasvnl/rd-to-wgs84) en getest tegen bekende
 * stadscentra (zie rd.test.ts) — nauwkeurig tot op enkele meters.
 */

// Oorsprong van de RD-projectie, in WGS84-graden (Amersfoort).
const PHI_0 = 52.15517440
const LAM_0 = 5.38720621

// Δφ (breedtegraad): coëfficiënt, macht van dX, macht van dY.
const PQ_PHI: [coefficient: number, machtDx: number, machtDy: number][] = [
  [3235.65389, 0, 1],
  [-32.58297, 2, 0],
  [-0.2475, 0, 2],
  [-0.84978, 2, 1],
  [-0.0655, 0, 3],
  [-0.01709, 2, 2],
  [-0.00738, 1, 0],
  [0.0053, 4, 0],
  [-0.00039, 2, 3],
  [0.00033, 4, 1],
  [-0.00012, 1, 1],
]

// Δλ (lengtegraad): coëfficiënt, macht van dX, macht van dY.
const PQ_LAM: [coefficient: number, machtDx: number, machtDy: number][] = [
  [5260.52916, 1, 0],
  [105.94684, 1, 1],
  [2.45656, 1, 2],
  [-0.81885, 3, 0],
  [0.05594, 1, 3],
  [-0.05607, 3, 1],
  [0.01199, 0, 1],
  [-0.00256, 3, 2],
  [0.00128, 1, 4],
  [0.00022, 0, 2],
  [-0.00022, 2, 0],
  [0.00026, 5, 0],
]

/**
 * Zet RD-coördinaten (x, y in meters) om naar WGS84 (lat, lng in graden).
 * Geeft geen foutcontrole op het geldige bereik — gebruik `isRdCoordinaat()`
 * daarvoor vooraf.
 */
export function rdNaarWgs84(x: number, y: number): { lat: number; lng: number } {
  const dX = (x - 155000) * 1e-5
  const dY = (y - 463000) * 1e-5

  let dPhi = 0
  for (const [coef, machtDx, machtDy] of PQ_PHI) {
    dPhi += coef * dX ** machtDx * dY ** machtDy
  }
  let dLam = 0
  for (const [coef, machtDx, machtDy] of PQ_LAM) {
    dLam += coef * dX ** machtDx * dY ** machtDy
  }

  return {
    lat: PHI_0 + dPhi / 3600,
    lng: LAM_0 + dLam / 3600,
  }
}

/**
 * Ruwe plausibiliteitscheck: valt (x, y) binnen het RD-bereik van Nederland?
 * Gebruikt om in `lib/importProfielen.ts`/`lib/importPijplijn.ts` te
 * onderscheiden of een coördinatenpaar RD of al WGS84 is (WGS84-lat/lng
 * liggen ver buiten dit bereik in meters-termen).
 */
export function isRdCoordinaat(x: number, y: number): boolean {
  return x >= 0 && x <= 300_000 && y >= 289_000 && y <= 629_000
}
