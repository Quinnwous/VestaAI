/**
 * CSV-import voor de transactiedataset (F4, zie CLAUDE.md § Hoofdstructuur en
 * docs/roadmap.md § Blokkades). Geen kolom-mapping-UI — de kolomnamen worden
 * herkend via een aliaslijst per veld (zie ALIASSEN), zodat een gewone
 * Realworks/Excel-export met redelijk voorspelbare kopnamen meteen werkt.
 * Rommelige rijen worden overgeslagen, niet de hele import laten falen.
 *
 * Sinds item 2.1 (schema v2, docs/roadmap.md § Fase 2) krijgt elke rij ook een
 * genormaliseerde `adres_sleutel` (lib/transactieNormalisatie.ts) — de nieuwe
 * upsert-sleutel op `transacties` (kantoor_id, adres_sleutel, verkoopdatum).
 * Een rij waarvoor geen betrouwbare sleutel te maken is (geen postcode+huisnummer
 * én geen straat+huisnummer+plaats) wordt niet geïmporteerd, net als een rij
 * zonder adres — zelfde `overgeslagen`-mechanisme. Dit is een importscherm van
 * de platform-admin (concierge-model, geen echte bron-integratie), dus
 * `bron` is hier altijd `'handmatig'`.
 */
import { adresSleutel, parseAdresVrijeTekst, woningtypeGroep, woningtypeSub } from './transactieNormalisatie'

export type TransactieVeld =
  | 'adres' | 'postcode' | 'plaats' | 'wijk' | 'buurt'
  | 'lat' | 'lng'
  | 'verkoopprijs' | 'vraagprijs' | 'verkoopdatum' | 'looptijd_dagen'
  | 'woningtype' | 'woonoppervlak_m2' | 'perceel_m2' | 'inhoud_m3'
  | 'bouwjaar' | 'energielabel' | 'kamers' | 'garage' | 'tuin' | 'buitenruimte'
  | 'eigen_verkoop' | 'verkopend_kantoor'

const ALIASSEN: Record<TransactieVeld, string[]> = {
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

export type TransactieInsert = {
  adres: string
  postcode: string | null
  plaats: string | null
  wijk: string | null
  buurt: string | null
  geo: string | null // WKT 'POINT(lng lat)' — Supabase/PostGIS accepteert dit direct
  verkoopprijs: number | null
  vraagprijs: number | null
  verkoopdatum: string | null
  looptijd_dagen: number | null
  woningtype: string | null
  woonoppervlak_m2: number | null
  perceel_m2: number | null
  inhoud_m3: number | null
  bouwjaar: number | null
  energielabel: string | null
  kamers: number | null
  garage: boolean | null
  tuin: boolean | null
  buitenruimte: string | null
  eigen_verkoop: boolean
  verkopend_kantoor: string | null
  // ── item 2.1 (schema v2) ──
  bron: 'handmatig'
  adres_sleutel: string
  huisnummer: number | null
  toevoeging: string | null
  woningtype_groep: string | null
  woningtype_sub: string | null
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

function vindKolom(headers: string[], veld: TransactieVeld): number {
  const genormaliseerd = headers.map(h => h.trim().toLowerCase().replace(/[\s-]+/g, '_'))
  for (const alias of ALIASSEN[veld]) {
    const idx = genormaliseerd.indexOf(alias)
    if (idx !== -1) return idx
  }
  return -1
}

/** Nederlandse en internationale getalnotatie: "1.250.000", "1250000", "1.250,50" → getal. */
function naarGetal(waarde: string | undefined): number | null {
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
function naarCoordinaat(waarde: string | undefined): number | null {
  if (!waarde) return null
  const schoon = waarde.replace(/[^\d.-]/g, '')
  const n = parseFloat(schoon)
  return Number.isFinite(n) ? n : null
}

function naarBoolean(waarde: string | undefined, standaard: boolean): boolean {
  if (waarde === undefined || waarde.trim() === '') return standaard
  return ['ja', 'true', '1', 'yes', 'y'].includes(waarde.trim().toLowerCase())
}

function naarDatum(waarde: string | undefined): string | null {
  if (!waarde) return null
  const trimmed = waarde.trim()
  // dd-mm-jjjj of dd/mm/jjjj -> ISO
  const nl = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (nl) return `${nl[3]}-${nl[2].padStart(2, '0')}-${nl[1].padStart(2, '0')}`
  // al ISO?
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  return null
}

export type ImportResultaat = {
  rijen: TransactieInsert[]
  overgeslagen: { regel: number; reden: string }[]
  gevondenKolommen: TransactieVeld[]
}

/** Parseert een CSV-bestand naar invoegbare transactierijen. Werpt geen fouten — rapporteert ze per rij. */
export function parseTransactieCsv(tekst: string): ImportResultaat {
  const alleRijen = parseCsv(tekst)
  if (alleRijen.length < 2) return { rijen: [], overgeslagen: [], gevondenKolommen: [] }

  const headers = alleRijen[0]
  const kolomIndex = {} as Record<TransactieVeld, number>
  for (const veld of Object.keys(ALIASSEN) as TransactieVeld[]) {
    kolomIndex[veld] = vindKolom(headers, veld)
  }
  const gevondenKolommen = (Object.keys(kolomIndex) as TransactieVeld[]).filter(v => kolomIndex[v] !== -1)

  const rijen: TransactieInsert[] = []
  const overgeslagen: { regel: number; reden: string }[] = []

  for (let i = 1; i < alleRijen.length; i++) {
    const rij = alleRijen[i]
    const get = (veld: TransactieVeld) => (kolomIndex[veld] !== -1 ? rij[kolomIndex[veld]] : undefined)

    const adres = get('adres')?.trim()
    if (!adres) {
      overgeslagen.push({ regel: i + 1, reden: 'Geen adres' })
      continue
    }

    const postcode = get('postcode')?.trim() || null
    const plaats = get('plaats')?.trim() || null

    // De CSV-aliassen kennen geen aparte huisnummer/toevoeging-kolom (§ ALIASSEN
    // hierboven) — die komen uit een parse van de vrije `adres`-tekst, dezelfde
    // die ook de sleutel-terugval voedt (lib/transactieNormalisatie.ts). Zo
    // gebruiken de opgeslagen huisnummer/toevoeging-kolommen en de sleutel
    // altijd exact dezelfde interpretatie van het adres.
    const onderdelen = parseAdresVrijeTekst(adres)
    const sleutel = adresSleutel({
      postcode,
      huisnummer: onderdelen.huisnummer,
      toevoeging: onderdelen.toevoeging,
      straat: onderdelen.straat,
      plaats,
    })
    if (!sleutel) {
      overgeslagen.push({
        regel: i + 1,
        reden: 'Geen betrouwbare adres-sleutel te maken (postcode+huisnummer of straat+huisnummer+plaats ontbreekt)',
      })
      continue
    }

    const lat = naarCoordinaat(get('lat'))
    const lng = naarCoordinaat(get('lng'))
    const geo = lat !== null && lng !== null ? `POINT(${lng} ${lat})` : null
    const woningtypeRuw = get('woningtype')?.trim() || null

    rijen.push({
      adres,
      postcode,
      plaats,
      wijk: get('wijk')?.trim() || null,
      buurt: get('buurt')?.trim() || null,
      geo,
      verkoopprijs: naarGetal(get('verkoopprijs')),
      vraagprijs: naarGetal(get('vraagprijs')),
      verkoopdatum: naarDatum(get('verkoopdatum')),
      looptijd_dagen: naarGetal(get('looptijd_dagen')),
      woningtype: woningtypeRuw,
      woonoppervlak_m2: naarGetal(get('woonoppervlak_m2')),
      perceel_m2: naarGetal(get('perceel_m2')),
      inhoud_m3: naarGetal(get('inhoud_m3')),
      bouwjaar: naarGetal(get('bouwjaar')),
      energielabel: get('energielabel')?.trim().toUpperCase() || null,
      kamers: naarGetal(get('kamers')),
      garage: kolomIndex.garage !== -1 ? naarBoolean(get('garage'), false) : null,
      tuin: kolomIndex.tuin !== -1 ? naarBoolean(get('tuin'), false) : null,
      buitenruimte: get('buitenruimte')?.trim() || null,
      eigen_verkoop: naarBoolean(get('eigen_verkoop'), true),
      verkopend_kantoor: get('verkopend_kantoor')?.trim() || null,
      bron: 'handmatig',
      adres_sleutel: sleutel,
      huisnummer: onderdelen.huisnummer,
      toevoeging: onderdelen.toevoeging,
      woningtype_groep: woningtypeGroep(woningtypeRuw),
      woningtype_sub: woningtypeSub(woningtypeRuw),
    })
  }

  return { rijen, overgeslagen, gevondenKolommen }
}
