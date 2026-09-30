/**
 * Bron-profielen voor de importpijplijn (item 5.2, docs/roadmap.md § Fase 5)
 * — per bron (Brainbay, Realworks) de extra kolomaliassen bovenop de
 * gedeelde `ALIASSEN` uit `lib/transactieImport.ts`, plus of coördinaten als
 * RD (X/Y) of al als WGS84 (lat/lng) worden aangeleverd.
 *
 * ⚠️ VOORLOPIG: de exacte kolomnamen van de echte Brainbay-/Realworks-
 * exports zijn nog niet bekend (die exports zijn er nog niet — zie
 * docs/roadmap.md § Fase 5, item 5.1 Exportanalyse). De aliassen hieronder
 * zijn een beredeneerde gok op basis van gangbare Nederlandse
 * makelaardij-/CRM-terminologie, zodat de rest van de pijplijn (kwaliteit,
 * ontdubbelen, upsert-script) nu al gebouwd en getest kan worden. Worden
 * DEFINITIEF gemaakt in item 5.1 zodra de echte exportbestanden er zijn —
 * dan hoeft alleen dit bestand (de aliaslijsten) te worden bijgewerkt, de
 * rest van de pijplijn blijft ongemoeid.
 *
 * `mapRij()` mapt één ruwe CSV/XLSX-rij naar een `BronRij` — een
 * "kale" tussenvorm die nog GEEN `adres_sleutel`, `woningtype_groep/sub`,
 * `verkopend_kantoor_norm` of `eigen_verkoop` heeft: die afleidingen horen
 * bij de "normaliseren"-stap van `lib/importPijplijn.ts` (die ook de
 * kantoor-aliassen van het kopende kantoor nodig heeft, iets wat een
 * kolom-profiel per definitie niet kent). Coördinaten worden hier wél al
 * omgezet (RD → WGS84 via `lib/rd.ts`) — dat is zuiver een kwestie van hoe
 * de bronkolommen te lezen, niet van kantoor-context.
 */
import { ALIASSEN, naarBoolean, naarCoordinaat, naarDatum, naarGetal, type TransactieVeld } from './transactieImport'
import { rdNaarWgs84, isRdCoordinaat } from './rd'

export type Bron = 'brainbay' | 'realworks' | 'handmatig'

/** Velden die niet in de gedeelde `TransactieVeld`-taxonomie zitten maar wel in een pijplijn-import voorkomen. */
export type ExtraVeld = 'rd_x' | 'rd_y' | 'aankopend_kantoor'

export type ImportProfiel = {
  bron: Bron
  /** Extra kolomaliassen bovenop `ALIASSEN[veld]` uit lib/transactieImport.ts (niet duplicerend, alleen aanvullend). */
  extraAliassen: Partial<Record<TransactieVeld, string[]>>
  /** Aliassen voor velden buiten de gedeelde taxonomie (RD-coördinaten, aankopend kantoor). */
  extraVeldAliassen: Partial<Record<ExtraVeld, string[]>>
  /** Puur documentair (welke notatie(s) deze bron gebruikt) — naarGetal()/naarDatum() zijn al notatie-tolerant, geen aparte parse-tak nodig per bron. */
  datumformaat: string
  decimaalnotatie: string
  /** 'rd': lees rd_x/rd_y en zet om via lib/rd.ts. 'wgs84': lees lat/lng direct (zoals de admin-CSV-import). */
  coordinatenType: 'rd' | 'wgs84'
}

// ── Brainbay (voorlopig — zie waarschuwing bovenaan) ────────────────────────
// Brainbay (Reasult) levert doorgaans een platte woningkenmerken-export met
// Nederlandse koppen; coördinaten zijn in dit soort taxatie-/marktdata vaak
// als RD X/Y-paar aanwezig (kadastrale bron), vandaar de gok op 'rd'.
const BRAINBAY: ImportProfiel = {
  bron: 'brainbay',
  extraAliassen: {
    adres: ['straatnaam', 'straat_huisnummer'],
    verkoopprijs: ['koopsom', 'transactieprijs_k_k', 'verkoopprijs_k_k'],
    vraagprijs: ['aanvangsvraagprijs', 'vraagprijs_k_k'],
    verkoopdatum: ['transactiedatum', 'datum_transactie', 'passeerdatum'],
    looptijd_dagen: ['looptijd_verkoop', 'aantal_dagen_te_koop'],
    woningtype: ['woningtype_brainbay', 'type_object', 'objectsoort'],
    woonoppervlak_m2: ['woonoppervlakte', 'gebruiksoppervlakte_wonen'],
    perceel_m2: ['perceeloppervlakte'],
    kamers: ['aantal_kamers', 'totaal_aantal_kamers'],
    verkopend_kantoor: ['aanbiedend_kantoor', 'verkopend_makelaarskantoor', 'kantoornaam'],
  },
  extraVeldAliassen: {
    rd_x: ['x_coordinaat', 'rd_x', 'x_rd', 'coordinaat_x'],
    rd_y: ['y_coordinaat', 'rd_y', 'y_rd', 'coordinaat_y'],
    aankopend_kantoor: ['aankopend_kantoor', 'kopend_kantoor', 'aankopende_makelaar'],
  },
  datumformaat: 'dd-mm-jjjj (NL-notatie, zoals de admin-CSV) — naarDatum() dekt dit al',
  decimaalnotatie: 'NL (komma als decimaalteken, punt als duizendtal) — naarGetal() dekt dit al',
  coordinatenType: 'rd',
}

// ── Realworks (voorlopig — zie waarschuwing bovenaan) ───────────────────────
// Realworks is het NVM-CRM zelf; een export daaruit levert vermoedelijk al
// WGS84 lat/lng (of geen coördinaat) i.p.v. RD, en Engelstalige/CRM-achtige
// veldnamen naast de Nederlandse voor bedragen/datums.
const REALWORKS: ImportProfiel = {
  bron: 'realworks',
  extraAliassen: {
    verkoopprijs: ['verkoopprijs_kk', 'transactiebedrag', 'koopsom_k_k'],
    vraagprijs: ['vraagprijs_kk', 'oorspronkelijke_vraagprijs'],
    verkoopdatum: ['datum_ondertekening', 'transportdatum', 'akte_datum'],
    woningtype: ['soort_woonhuis', 'woningtype_realworks'],
    woonoppervlak_m2: ['gebruiksoppervlakte_wonen_m2', 'woonoppervlak'],
    energielabel: ['energieklasse', 'energie_index'],
    verkopend_kantoor: ['makelaarskantoor', 'kantoor_verkopend', 'nvm_kantoor'],
  },
  extraVeldAliassen: {
    aankopend_kantoor: ['aankopend_kantoor', 'kantoor_aankopend', 'kopende_makelaar'],
  },
  datumformaat: 'ISO (jjjj-mm-dd) of dd-mm-jjjj — naarDatum() dekt beide al',
  decimaalnotatie: 'internationaal (punt als decimaalteken) of NL — naarGetal() dekt beide al',
  coordinatenType: 'wgs84',
}

// ── Handmatig (item i2, docs/archief/specs/i2-admin-csv-via-pijplijn.md) ───────────
// De CSV-upload op /admin/transacties: geen bron-specifieke aliassen (de
// beheerder levert zelf een bestand aan, geen vast CRM-exportformaat), dus
// alleen de gedeelde `ALIASSEN` uit lib/transactieImport.ts. Coördinaten
// komen — net als bij de andere bronnen — als kant-en-klare lat/lng-kolommen
// aan, nooit als RD X/Y.
const HANDMATIG: ImportProfiel = {
  bron: 'handmatig',
  extraAliassen: {},
  extraVeldAliassen: {},
  datumformaat: 'NL (dd-mm-jjjj) of ISO (jjjj-mm-dd) — naarDatum() dekt beide al',
  decimaalnotatie: 'NL (komma) of internationaal (punt) — naarGetal() dekt beide al',
  coordinatenType: 'wgs84',
}

export const PROFIELEN: Record<Bron, ImportProfiel> = {
  brainbay: BRAINBAY,
  realworks: REALWORKS,
  handmatig: HANDMATIG,
}

/** Kolomindex-lookup met een eigen (mogelijk per bron aangevulde) aliaslijst — zelfde normalisatie als vindKolom() in transactieImport.ts, maar niet gebonden aan de globale ALIASSEN. */
function vindKolomMetAliassen(headers: string[], aliassen: string[]): number {
  const genormaliseerd = headers.map(h => h.trim().toLowerCase().replace(/[\s-]+/g, '_'))
  for (const alias of aliassen) {
    const idx = genormaliseerd.indexOf(alias)
    if (idx !== -1) return idx
  }
  return -1
}

/** "Kale" gemapte rij — vóór adres_sleutel/woningtype-groep/eigen_verkoop-afleiding (zie lib/importPijplijn.ts). */
export type BronRij = {
  adres: string
  postcode: string | null
  plaats: string | null
  wijk: string | null
  buurt: string | null
  lat: number | null
  lng: number | null
  verkoopprijs: number | null
  vraagprijs: number | null
  verkoopdatum: string | null
  looptijd_dagen: number | null
  /** Ruwe bronwaarde — lib/transactieNormalisatie.ts woningtypeGroep()/woningtypeSub() mappen dit pas in de normaliseer-stap. */
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
  /** Ruwe kantoornaam uit de export — genormaliseerd tot verkopend_kantoor_norm in de pijplijn. */
  verkopend_kantoor: string | null
  aankopend_kantoor: string | null
  bron: Bron
  /**
   * `eigen_verkoop`-kolom (alias-lijst `ALIASSEN.eigen_verkoop`), als die in
   * het bestand voorkomt — `null` als de kolom ontbreekt. Een expliciete
   * waarde wint in de pijplijn altijd van de kantoor-aliassen-afleiding (item
   * i2): alleen bij `null` valt `voerImportPijplijnUit()` terug op
   * `isEigenKantoor()`.
   */
  eigen_verkoop_expliciet: boolean | null
}

/**
 * Mapt één ruwe rij (waarden in dezelfde volgorde als `headers`) naar een
 * `BronRij`, met de basisaliassen uit `lib/transactieImport.ts` aangevuld
 * met `profiel.extraAliassen`. Geeft `null` als er geen adres te vinden is
 * — zo'n rij is niet bruikbaar.
 */
export function mapRij(ruweRij: string[], headers: string[], profiel: ImportProfiel): BronRij | null {
  const kolomIndex = {} as Record<TransactieVeld, number>
  for (const veld of Object.keys(ALIASSEN) as TransactieVeld[]) {
    const aliassen = [...ALIASSEN[veld], ...(profiel.extraAliassen[veld] ?? [])]
    kolomIndex[veld] = vindKolomMetAliassen(headers, aliassen)
  }
  const get = (veld: TransactieVeld): string | undefined => (kolomIndex[veld] !== -1 ? ruweRij[kolomIndex[veld]] : undefined)

  const extraIndex = {} as Record<ExtraVeld, number>
  for (const veld of Object.keys(profiel.extraVeldAliassen) as ExtraVeld[]) {
    extraIndex[veld] = vindKolomMetAliassen(headers, profiel.extraVeldAliassen[veld] ?? [])
  }
  const getExtra = (veld: ExtraVeld): string | undefined =>
    extraIndex[veld] !== undefined && extraIndex[veld] !== -1 ? ruweRij[extraIndex[veld]] : undefined

  const adres = get('adres')?.trim()
  if (!adres) return null

  let lat: number | null = null
  let lng: number | null = null
  if (profiel.coordinatenType === 'rd') {
    const x = naarCoordinaat(getExtra('rd_x'))
    const y = naarCoordinaat(getExtra('rd_y'))
    if (x !== null && y !== null && isRdCoordinaat(x, y)) {
      const omgezet = rdNaarWgs84(x, y)
      lat = omgezet.lat
      lng = omgezet.lng
    }
  } else {
    lat = naarCoordinaat(get('lat'))
    lng = naarCoordinaat(get('lng'))
  }

  return {
    adres,
    postcode: get('postcode')?.trim() || null,
    plaats: get('plaats')?.trim() || null,
    wijk: get('wijk')?.trim() || null,
    buurt: get('buurt')?.trim() || null,
    lat,
    lng,
    verkoopprijs: naarGetal(get('verkoopprijs')),
    vraagprijs: naarGetal(get('vraagprijs')),
    verkoopdatum: naarDatum(get('verkoopdatum')),
    looptijd_dagen: naarGetal(get('looptijd_dagen')),
    woningtype: get('woningtype')?.trim() || null,
    woonoppervlak_m2: naarGetal(get('woonoppervlak_m2')),
    perceel_m2: naarGetal(get('perceel_m2')),
    inhoud_m3: naarGetal(get('inhoud_m3')),
    bouwjaar: naarGetal(get('bouwjaar')),
    energielabel: get('energielabel')?.trim().toUpperCase() || null,
    kamers: naarGetal(get('kamers')),
    garage: kolomIndex.garage !== -1 ? naarBoolean(get('garage'), false) : null,
    tuin: kolomIndex.tuin !== -1 ? naarBoolean(get('tuin'), false) : null,
    buitenruimte: get('buitenruimte')?.trim() || null,
    verkopend_kantoor: get('verkopend_kantoor')?.trim() || null,
    aankopend_kantoor: getExtra('aankopend_kantoor')?.trim() || null,
    bron: profiel.bron,
    eigen_verkoop_expliciet: kolomIndex.eigen_verkoop !== -1 ? naarBoolean(get('eigen_verkoop'), false) : null,
  }
}
