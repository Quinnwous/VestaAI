/**
 * Pure orkestratie van de importpijplijn (item 5.2, docs/roadmap.md § Fase
 * 5): ruwe rijen → mappen (`lib/importProfielen.ts` `mapRij()`) →
 * normaliseren (adres_sleutel, plaats (`canoniekePlaats()`, item J1,
 * docs/archief/specs/j1-plaatsnormalisatie.md), woningtype-groep/sub,
 * verkopend_kantoor_norm, eigen_verkoop) → kwaliteit (`lib/transactieKwaliteit.ts`) → ontdubbelen
 * (`lib/ontdubbelen.ts`) → `{ rijen, rapport }`. Geen Supabase-afhankelijkheid
 * hier — `scripts/import-transacties.mjs` roept dit aan en doet zelf de
 * database-I/O (lezen van bestaande rijen, upserten, wegschrijven van de
 * `imports`-rij).
 *
 * `bouwSnapshot()` volgt het contract van `lib/importSnapshot.ts` — voedt
 * `imports.snapshot_json`, gelezen door een latere "laatste import
 * terugdraaien" (item 5.4, andere agent/sessie).
 */
import { mapRij, type Bron, type ImportProfiel } from './importProfielen'
import { adresSleutel, parseAdresVrijeTekst, woningtypeGroep, woningtypeSub } from './transactieNormalisatie'
import { beoordeelTransactie, KWALITEIT_LABELS, type KwaliteitsRedenCode } from './transactieKwaliteit'
import { isEigenKantoor, normaliseerKantoornaam } from './kantoorNormalisatie'
import { ontdubbel, type OntdubbelVoorbeeld } from './ontdubbelen'
import { IMPORT_SNAPSHOT_VERSIE, MAX_SNAPSHOT_RIJEN, type ImportSnapshot, type ImportSnapshotRij } from './importSnapshot'
import { canoniekePlaats } from './plaatsNormalisatie'

/** Eén rij, klaar om te upserten op `transacties` (op `kantoor_id` na — dat voegt het script toe). */
export type GenormaliseerdeRij = {
  adres: string
  postcode: string | null
  plaats: string | null
  wijk: string | null
  buurt: string | null
  /** WKT 'POINT(lng lat)', of null zonder (nog) bekende coördinaat — dan pakt fase 5.3 (geocodering) hem op. */
  geo: string | null
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
  bron: Bron
  adres_sleutel: string
  huisnummer: number | null
  toevoeging: string | null
  woningtype_groep: string | null
  woningtype_sub: string | null
  geocode_status: 'exact' | 'benaderd' | 'mislukt' | null
  uitgesloten_reden: KwaliteitsRedenCode | null
  aankopend_kantoor: string | null
  verkopend_kantoor_norm: string | null
}

export type ImportRapport = {
  totaalRuw: number
  /** Rijen die zelfs niet gemapt konden worden (geen adres/geen sleutel) — niet in `rijen`, ook niet als uitgesloten rij. */
  overgeslagen: { regel: number; reden: string }[]
  /** Na ontdubbelen — inclusief uitgesloten rijen (die blijven bestaan, zie transactieKwaliteit.ts). */
  totaalGeimporteerd: number
  perUitsluitreden: { reden: KwaliteitsRedenCode; label: string; aantal: number }[]
  voorbeeldenPerUitsluitreden: { reden: KwaliteitsRedenCode; label: string; voorbeelden: { adres: string }[] }[]
  perPlaats: { plaats: string; aantal: number }[]
  perJaar: { jaar: number; aantal: number }[]
  /** Percentage van de geïmporteerde (niet-uitgesloten of uitgesloten, alle) rijen met een coördinaat, 1 decimaal. */
  pctMetCoordinaat: number
  aantalEigenVerkopen: number
  samengevoegd: number
  voorbeeldenSamenvoegingen: OntdubbelVoorbeeld[]
}

export type PijplijnResultaat = {
  rijen: GenormaliseerdeRij[]
  rapport: ImportRapport
}

/**
 * Leest `imports.kwaliteitsrapport_json` typeveilig — het komt ongevalideerd
 * uit de database (jsonb) terug (item i2, docs/archief/specs/i2-admin-csv-via-pijplijn.md).
 * `null` bij afwezige/onherkenbare vorm (bv. een import van vóór dit rapport
 * bestond), zodat de UI (`app/admin/transacties/Importhistorie.tsx`) nooit op
 * `unknown` hoeft te gokken. Zelfde patroon als `leesImportSnapshot()` in
 * lib/importSnapshot.ts.
 */
export function leesImportRapport(json: unknown): ImportRapport | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null
  const r = json as Partial<ImportRapport>
  const geldig =
    typeof r.totaalRuw === 'number' &&
    Array.isArray(r.overgeslagen) &&
    typeof r.totaalGeimporteerd === 'number' &&
    Array.isArray(r.perUitsluitreden) &&
    Array.isArray(r.voorbeeldenPerUitsluitreden) &&
    Array.isArray(r.perPlaats) &&
    Array.isArray(r.perJaar) &&
    typeof r.pctMetCoordinaat === 'number' &&
    typeof r.aantalEigenVerkopen === 'number' &&
    typeof r.samengevoegd === 'number' &&
    Array.isArray(r.voorbeeldenSamenvoegingen)
  return geldig ? (r as ImportRapport) : null
}

const MAX_VOORBEELDEN_PER_REDEN = 10

/**
 * Voert de volledige pijplijn uit op de rauwe rijen van één CSV/XLSX-bestand
 * (waarden, geen headers). `kantoorAliassen` komt uit
 * `kantoren.instellingen_json.kantoor_aliassen` van het kantoor waarvoor
 * wordt geïmporteerd (bepaalt `eigen_verkoop` via `isEigenKantoor()`).
 * `opties.vandaag` is injecteerbaar voor deterministische tests (zie
 * `lib/transactieKwaliteit.ts`).
 */
export function voerImportPijplijnUit(
  ruweRijen: string[][],
  headers: string[],
  profiel: ImportProfiel,
  kantoorAliassen: string[],
  opties: { vandaag?: Date } = {},
): PijplijnResultaat {
  const overgeslagen: { regel: number; reden: string }[] = []
  const genormaliseerd: GenormaliseerdeRij[] = []

  ruweRijen.forEach((ruweRij, i) => {
    const regel = i + 2 // rij 1 is de header

    const bronRij = mapRij(ruweRij, headers, profiel)
    if (!bronRij) {
      overgeslagen.push({ regel, reden: 'Geen adres' })
      return
    }

    const onderdelen = parseAdresVrijeTekst(bronRij.adres)
    const sleutel = adresSleutel({
      postcode: bronRij.postcode,
      huisnummer: onderdelen.huisnummer,
      toevoeging: onderdelen.toevoeging,
      straat: onderdelen.straat,
      plaats: bronRij.plaats,
    })
    if (!sleutel) {
      overgeslagen.push({
        regel,
        reden: 'Geen betrouwbare adres-sleutel te maken (postcode+huisnummer of straat+huisnummer+plaats ontbreekt)',
      })
      return
    }

    const geo = bronRij.lat !== null && bronRij.lng !== null ? `POINT(${bronRij.lng} ${bronRij.lat})` : null
    const kwaliteit = beoordeelTransactie(
      {
        adres_sleutel: sleutel,
        verkoopprijs: bronRij.verkoopprijs,
        woonoppervlak_m2: bronRij.woonoppervlak_m2,
        bouwjaar: bronRij.bouwjaar,
        verkoopdatum: bronRij.verkoopdatum,
      },
      { vandaag: opties.vandaag },
    )

    genormaliseerd.push({
      adres: bronRij.adres,
      postcode: bronRij.postcode,
      // Canonieke schrijfwijze bij het schrijven (item J1): "Den Haag" i.p.v.
      // "'s-Gravenhage"/"S GRAVENHAGE"/etc., zodat elke latere exacte
      // vergelijking (RPC-filters, werkgebied) vanzelf klopt — zie
      // lib/plaatsNormalisatie.ts.
      plaats: bronRij.plaats !== null ? canoniekePlaats(bronRij.plaats) : null,
      wijk: bronRij.wijk,
      buurt: bronRij.buurt,
      geo,
      verkoopprijs: bronRij.verkoopprijs,
      vraagprijs: bronRij.vraagprijs,
      verkoopdatum: bronRij.verkoopdatum,
      looptijd_dagen: bronRij.looptijd_dagen,
      woningtype: bronRij.woningtype,
      woonoppervlak_m2: bronRij.woonoppervlak_m2,
      perceel_m2: bronRij.perceel_m2,
      inhoud_m3: bronRij.inhoud_m3,
      bouwjaar: bronRij.bouwjaar,
      energielabel: bronRij.energielabel,
      kamers: bronRij.kamers,
      garage: bronRij.garage,
      tuin: bronRij.tuin,
      buitenruimte: bronRij.buitenruimte,
      // Een expliciete eigen_verkoop-kolom in het bestand wint altijd van de
      // kantoor-aliassen-afleiding (item i2, docs/archief/specs/i2-admin-csv-via-pijplijn.md).
      eigen_verkoop: bronRij.eigen_verkoop_expliciet ?? isEigenKantoor(bronRij.verkopend_kantoor, kantoorAliassen),
      verkopend_kantoor: bronRij.verkopend_kantoor,
      bron: bronRij.bron,
      adres_sleutel: sleutel,
      huisnummer: onderdelen.huisnummer,
      toevoeging: onderdelen.toevoeging,
      woningtype_groep: woningtypeGroep(bronRij.woningtype),
      woningtype_sub: woningtypeSub(bronRij.woningtype),
      geocode_status: geo !== null ? 'exact' : null,
      uitgesloten_reden: kwaliteit.uitgesloten_reden,
      aankopend_kantoor: bronRij.aankopend_kantoor,
      verkopend_kantoor_norm: normaliseerKantoornaam(bronRij.verkopend_kantoor),
    })
  })

  const { rijen, samengevoegd, voorbeelden: voorbeeldenSamenvoegingen } = ontdubbel(genormaliseerd)

  const rapport = bouwRapport(ruweRijen.length, rijen, overgeslagen, samengevoegd, voorbeeldenSamenvoegingen)

  return { rijen, rapport }
}

function bouwRapport(
  totaalRuw: number,
  rijen: GenormaliseerdeRij[],
  overgeslagen: { regel: number; reden: string }[],
  samengevoegd: number,
  voorbeeldenSamenvoegingen: OntdubbelVoorbeeld[],
): ImportRapport {
  const perUitsluitreden = new Map<KwaliteitsRedenCode, number>()
  const voorbeeldenPerReden = new Map<KwaliteitsRedenCode, { adres: string }[]>()
  const perPlaats = new Map<string, number>()
  const perJaar = new Map<number, number>()
  let metCoordinaat = 0
  let eigenVerkopen = 0

  for (const rij of rijen) {
    if (rij.uitgesloten_reden) {
      perUitsluitreden.set(rij.uitgesloten_reden, (perUitsluitreden.get(rij.uitgesloten_reden) ?? 0) + 1)
      const lijst = voorbeeldenPerReden.get(rij.uitgesloten_reden) ?? []
      if (lijst.length < MAX_VOORBEELDEN_PER_REDEN) lijst.push({ adres: rij.adres })
      voorbeeldenPerReden.set(rij.uitgesloten_reden, lijst)
    }
    if (rij.plaats) perPlaats.set(rij.plaats, (perPlaats.get(rij.plaats) ?? 0) + 1)
    if (rij.verkoopdatum) {
      const jaar = Number(rij.verkoopdatum.slice(0, 4))
      if (Number.isFinite(jaar)) perJaar.set(jaar, (perJaar.get(jaar) ?? 0) + 1)
    }
    if (rij.geo) metCoordinaat++
    if (rij.eigen_verkoop) eigenVerkopen++
  }

  return {
    totaalRuw,
    overgeslagen,
    totaalGeimporteerd: rijen.length,
    perUitsluitreden: Array.from(perUitsluitreden.entries(), ([reden, aantal]) => ({ reden, label: KWALITEIT_LABELS[reden], aantal })),
    voorbeeldenPerUitsluitreden: Array.from(voorbeeldenPerReden.entries(), ([reden, voorbeelden]) => ({
      reden,
      label: KWALITEIT_LABELS[reden],
      voorbeelden,
    })),
    perPlaats: Array.from(perPlaats.entries(), ([plaats, aantal]) => ({ plaats, aantal })).sort((a, b) => b.aantal - a.aantal),
    perJaar: Array.from(perJaar.entries(), ([jaar, aantal]) => ({ jaar, aantal })).sort((a, b) => a.jaar - b.jaar),
    pctMetCoordinaat: rijen.length > 0 ? Math.round((metCoordinaat / rijen.length) * 1000) / 10 : 0,
    aantalEigenVerkopen: eigenVerkopen,
    samengevoegd,
    voorbeeldenSamenvoegingen,
  }
}

/** Bestaande transactierij (uit de database, opgehaald vóór het upserten) — minimaal de match-sleutel + import_id + de kolommen die de import overschrijft. */
export type BestaandeTransactieRij = {
  id: string
  adres_sleutel: string
  verkoopdatum: string | null
  import_id: string | null
} & Record<string, unknown>

/**
 * Bouwt `imports.snapshot_json` volgens `lib/importSnapshot.ts`: voor elke
 * nieuwe rij die een bestaande rij overschrijft (zelfde adres_sleutel +
 * verkoopdatum), de vorige waarden van precies de kolommen die deze import
 * schrijft (plus altijd `import_id`, voor het herstellen van "hoorde
 * hiervoor bij import Y"). Een nieuwe rij zonder match levert geen
 * snapshot-entry op — terugdraaien verwijdert die simpelweg op `import_id`.
 * Kapt af op `MAX_SNAPSHOT_RIJEN` (zet dan `afgekapt: true`, zoals het
 * contract voorschrijft) i.p.v. een onbegrensd grote jsonb-kolom te schrijven.
 */
export function bouwSnapshot(bestaandeRijen: BestaandeTransactieRij[], nieuweRijen: GenormaliseerdeRij[]): ImportSnapshot {
  const index = new Map<string, BestaandeTransactieRij>()
  for (const rij of bestaandeRijen) {
    index.set(`${rij.adres_sleutel}::${rij.verkoopdatum ?? ''}`, rij)
  }

  const geschrevenKolommen = nieuweRijen.length > 0 ? (Object.keys(nieuweRijen[0]) as (keyof GenormaliseerdeRij)[]) : []

  const bijgewerkt: ImportSnapshotRij[] = []
  let afgekapt = false

  for (const nieuw of nieuweRijen) {
    const bestaand = index.get(`${nieuw.adres_sleutel}::${nieuw.verkoopdatum ?? ''}`)
    if (!bestaand) continue // nieuwe rij — geen vorige waarde te bewaren, terugdraaien verwijdert 'm gewoon

    if (bijgewerkt.length >= MAX_SNAPSHOT_RIJEN) {
      afgekapt = true
      continue
    }

    const vorige: Record<string, unknown> = { import_id: bestaand.import_id ?? null }
    for (const kolom of geschrevenKolommen) {
      if (kolom in bestaand) vorige[kolom] = bestaand[kolom]
    }
    bijgewerkt.push({ id: bestaand.id, vorige })
  }

  return { versie: IMPORT_SNAPSHOT_VERSIE, bijgewerkt, afgekapt }
}

/**
 * Telt hoeveel van `nieuweRijen` een bestaande rij bijwerken vs. echt nieuw
 * zijn — voor `imports.aantal_nieuw`/`aantal_bijgewerkt`. Losstaand van
 * `bouwSnapshot()` omdat die zelf afkapt op `MAX_SNAPSHOT_RIJEN` (het
 * snapshot-contract) terwijl deze telling altijd het volledige, echte
 * aantal moet geven — ook als de snapshot zelf afgekapt is.
 */
export function telNieuwEnBijgewerkt(
  bestaandeRijen: BestaandeTransactieRij[],
  nieuweRijen: GenormaliseerdeRij[],
): { nieuw: number; bijgewerkt: number } {
  const sleutels = new Set(bestaandeRijen.map(r => `${r.adres_sleutel}::${r.verkoopdatum ?? ''}`))
  let bijgewerkt = 0
  for (const rij of nieuweRijen) {
    if (sleutels.has(`${rij.adres_sleutel}::${rij.verkoopdatum ?? ''}`)) bijgewerkt++
  }
  return { nieuw: nieuweRijen.length - bijgewerkt, bijgewerkt }
}

// ── Upsert-batches: aanvulbare velden niet wissen ───────────────────────────

/**
 * Kolommen die ná de import nog aangevuld worden (geocodering: `geo`,
 * `geocode_status`, `wijk`, `buurt`). Heeft een importrij hier geen waarde
 * voor, dan mag de upsert een eerder aangevulde waarde niet met null
 * overschrijven — anders wist elke periodieke herimport zonder coördinaten
 * alle gegeocodeerde locaties.
 */
export const AANVULBARE_KOLOMMEN = ['geo', 'geocode_status', 'wijk', 'buurt'] as const

/**
 * Deelt rijen op in upsert-batches waarin elke rij precies dezelfde kolommen
 * heeft. Lege aanvulbare kolommen worden weggelaten, en per kolomset apart
 * geüpsert: supabase-js vult een ontbrekende sleutel binnen één batch
 * anders aan met null (en PostgREST werkt bij een conflict alleen de
 * meegestuurde kolommen bij).
 */
export function maakUpsertBatches<T extends Record<string, unknown>>(rijen: T[], batchGrootte = 500): Record<string, unknown>[][] {
  const perSet = new Map<string, Record<string, unknown>[]>()
  for (const rij of rijen) {
    const schoon: Record<string, unknown> = { ...rij }
    for (const kolom of AANVULBARE_KOLOMMEN) {
      if (schoon[kolom] === null || schoon[kolom] === undefined) delete schoon[kolom]
    }
    const sleutel = Object.keys(schoon).sort().join(',')
    const groep = perSet.get(sleutel)
    if (groep) groep.push(schoon)
    else perSet.set(sleutel, [schoon])
  }
  const batches: Record<string, unknown>[][] = []
  for (const groep of Array.from(perSet.values())) {
    for (let i = 0; i < groep.length; i += batchGrootte) batches.push(groep.slice(i, i + batchGrootte))
  }
  return batches
}
