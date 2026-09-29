/**
 * Parse-helpers voor de transactie-CSV-import (F4, zie CLAUDE.md § Hoofdstructuur
 * en docs/roadmap.md § Blokkades). Geen kolom-mapping-UI — de kolomnamen worden
 * herkend via een aliaslijst per veld (zie ALIASSEN), zodat een gewone
 * Realworks/Excel-export met redelijk voorspelbare kopnamen meteen werkt.
 *
 * Sinds item i2 (docs/specs/i2-admin-csv-via-pijplijn.md) is dit geen eigen
 * importroute meer, maar een bibliotheek met bouwstenen (CSV-parser,
 * kolomherkenning, veldconversies) die `lib/importPijplijn.ts`
 * (`voerImportPijplijnUit`) en `lib/importProfielen.ts` hergebruiken — alle
 * imports (admin-upload én scripts/import-transacties.mjs) lopen via die
 * pijplijn, die ook de `adres_sleutel` (lib/transactieNormalisatie.ts) en de
 * `bron`-toekenning per profiel verzorgt.
 */

export type TransactieVeld =
  | 'adres' | 'postcode' | 'plaats' | 'wijk' | 'buurt'
  | 'lat' | 'lng'
  | 'verkoopprijs' | 'vraagprijs' | 'verkoopdatum' | 'looptijd_dagen'
  | 'woningtype' | 'woonoppervlak_m2' | 'perceel_m2' | 'inhoud_m3'
  | 'bouwjaar' | 'energielabel' | 'kamers' | 'garage' | 'tuin' | 'buitenruimte'
  | 'eigen_verkoop' | 'verkopend_kantoor'

// Basislijst van kolomaliassen; lib/importProfielen.ts legt per bron extra
// aliassen hierbovenop, zonder deze lijst te dupliceren.
export const ALIASSEN: Record<TransactieVeld, string[]> = {
  adres: ['adres', 'address', 'straat'],
  postcode: ['postcode', 'zip', 'zipcode'],
  plaats: ['plaats', 'stad', 'city', 'woonplaats'],
  wijk: ['wijk'],
  buurt: ['buurt'],
  lat: ['lat', 'latitude', 'breedtegraad'],
  lng: ['lng', 'lon', 'long', 'longitude', 'lengtegraad'],
  verkoopprijs: ['verkoopprijs', 'transactieprijs', 'prijs', 'koopsom'],
  vraagprijs: ['vraagprijs', 'aanvangsprijs'],
  verkoopdatum: ['verkoopdatum', 'datum', 'transactiedatum'],
  looptijd_dagen: ['looptijd', 'looptijd_dagen', 'dagen_te_koop'],
  woningtype: ['type', 'woningtype', 'objecttype'],
  woonoppervlak_m2: ['oppervlak', 'woonoppervlak', 'oppervlakte', 'm2', 'gbo'],
  perceel_m2: ['perceel', 'perceeloppervlak', 'kavel', 'kavelgrootte'],
  inhoud_m3: ['inhoud', 'inhoud_m3', 'm3'],
  bouwjaar: ['bouwjaar', 'jaar'],
  energielabel: ['energielabel', 'label'],
  kamers: ['kamers', 'aantal_kamers'],
  garage: ['garage'],
  tuin: ['tuin'],
  buitenruimte: ['buitenruimte'],
  eigen_verkoop: ['eigen_verkoop', 'eigen', 'own'],
  verkopend_kantoor: ['verkopend_kantoor', 'kantoor', 'makelaar'],
}

/** Simpele, robuuste CSV-parser: komma- of puntkomma-gescheiden, ondersteunt "quoted,velden". */
export function parseCsv(tekst: string): string[][] {
  const scheidingsteken = tekst.slice(0, tekst.indexOf('\n')).includes(';') ? ';' : ','
  const rijen: string[][] = []
  let veld = ''
  let rij: string[] = []
  let inQuotes = false
  const schoon = tekst.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < schoon.length; i++) {
    const c = schoon[i]
    if (inQuotes) {
      if (c === '"') {
        if (schoon[i + 1] === '"') { veld += '"'; i++ } else { inQuotes = false }
      } else {
        veld += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === scheidingsteken) {
      rij.push(veld); veld = ''
    } else if (c === '\n') {
      rij.push(veld); veld = ''
      rijen.push(rij); rij = []
    } else {
      veld += c
    }
  }
  if (veld.length > 0 || rij.length > 0) { rij.push(veld); rijen.push(rij) }
  return rijen.filter(r => r.some(v => v.trim() !== ''))
}

export function vindKolom(headers: string[], veld: TransactieVeld): number {
  const genormaliseerd = headers.map(h => h.trim().toLowerCase().replace(/[\s-]+/g, '_'))
  for (const alias of ALIASSEN[veld]) {
    const idx = genormaliseerd.indexOf(alias)
    if (idx !== -1) return idx
  }
  return -1
}

/** Nederlandse en internationale getalnotatie: "1.250.000", "1250000", "1.250,50" → getal. */
export function naarGetal(waarde: string | undefined): number | null {
  if (!waarde) return null
  let schoon = waarde.replace(/[^\d,.-]/g, '')
  if (schoon.includes(',')) {
    // Komma is het decimaalteken; punten zijn duizendtal-scheiding.
    schoon = schoon.replace(/\./g, '').replace(',', '.')
  } else {
    const aantalPunten = (schoon.match(/\./g) ?? []).length
    if (aantalPunten > 1) {
      schoon = schoon.replace(/\./g, '')
    } else if (aantalPunten === 1 && schoon.split('.')[1]?.length === 3) {
      // Eén punt gevolgd door precies drie cijfers: duizendtal-scheiding ("1.250" = 1250),
      // geen decimaal — in deze dataset zijn dat altijd hele bedragen/oppervlaktes.
      schoon = schoon.replace('.', '')
    }
  }
  const n = parseFloat(schoon)
  return Number.isFinite(n) ? Math.round(n) : null
}

/** Coördinaat (lat/lng) — in tegenstelling tot naarGetal() nooit afronden. */
export function naarCoordinaat(waarde: string | undefined): number | null {
  if (!waarde) return null
  const schoon = waarde.replace(/[^\d.-]/g, '')
  const n = parseFloat(schoon)
  return Number.isFinite(n) ? n : null
}

export function naarBoolean(waarde: string | undefined, standaard: boolean): boolean {
  if (waarde === undefined || waarde.trim() === '') return standaard
  return ['ja', 'true', '1', 'yes', 'y'].includes(waarde.trim().toLowerCase())
}

export function naarDatum(waarde: string | undefined): string | null {
  if (!waarde) return null
  const trimmed = waarde.trim()
  // dd-mm-jjjj of dd/mm/jjjj -> ISO
  const nl = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (nl) return `${nl[3]}-${nl[2].padStart(2, '0')}-${nl[1].padStart(2, '0')}`
  // al ISO?
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  return null
}

