/**
 * Ontdubbelen van geïmporteerde transactierijen (item 5.2, docs/roadmap.md
 * § Fase 5) — vóór het upserten in de database, zodat een woning die zowel
 * in de Brainbay- als de Realworks-export voorkomt niet twee keer wordt
 * opgeslagen (de unieke index `(kantoor_id, adres_sleutel, verkoopdatum)`
 * zou dat toch al voorkomen bíj exact gelijke datum, maar twee bronnen
 * registreren vaak een net iets andere datum voor dezelfde transactie —
 * vandaar de ± 90 dagen-marge hieronder).
 *
 * Twee stappen, in deze volgorde:
 * 1. Binnen één bron: exact dezelfde `adres_sleutel` + `verkoopdatum` →
 *    laatste rij wint (de eerdere(n) worden verworpen, niet samengevoegd).
 * 2. Tussen Brainbay en Realworks: dezelfde `adres_sleutel`, verkoopdatum
 *    binnen 90 dagen van elkaar → Realworks wint (haar velden hebben
 *    voorrang), ontbrekende (null/undefined) Realworks-velden worden
 *    aangevuld uit de gekoppelde Brainbay-rij. Andere bronnen ('handmatig',
 *    'fixture') doen niet mee aan deze cross-bron-koppeling — die gaan
 *    ongewijzigd door (na stap 1).
 *
 * Generiek over het rijtype T (alleen `adres_sleutel`/`verkoopdatum`/`bron`
 * zijn vereist) zodat dit op de rijkere vorm van `lib/importPijplijn.ts`
 * (`GenormaliseerdeRij`) werkt.
 */

export type OntdubbelKern = {
  adres_sleutel: string
  verkoopdatum: string | null
  bron: string
}

export type OntdubbelVoorbeeld = {
  adresSleutel: string
  verkoopdatumRealworks: string | null
  verkoopdatumBrainbay: string | null
  aangevuldeVelden: string[]
}

export type OntdubbelResultaat<T> = {
  rijen: T[]
  /** Aantal Realworks/Brainbay-paren dat is samengevoegd tot één rij. */
  samengevoegd: number
  /** Voorbeelden van samenvoegingen (max. 10), voor het kwaliteitsrapport. */
  voorbeelden: OntdubbelVoorbeeld[]
}

const MAX_VOORBEELDEN = 10
const VENSTER_DAGEN = 90

function dagVerschil(a: string, b: string): number {
  const da = new Date(`${a.slice(0, 10)}T00:00:00Z`).getTime()
  const db = new Date(`${b.slice(0, 10)}T00:00:00Z`).getTime()
  return Math.abs(da - db) / (1000 * 60 * 60 * 24)
}

/** Stap 1: binnen één bron, identieke sleutel+datum → alleen de laatste rij blijft over. */
function ontdubbelBinnenBron<T extends OntdubbelKern>(rijen: T[]): T[] {
  const laatsteIndexPerSleutel = new Map<string, number>()
  rijen.forEach((rij, i) => {
    if (!rij.verkoopdatum) return
    laatsteIndexPerSleutel.set(`${rij.bron}::${rij.adres_sleutel}::${rij.verkoopdatum}`, i)
  })
  return rijen.filter((rij, i) => {
    if (!rij.verkoopdatum) return true // geen sleutel om op te dedupliceren — altijd behouden
    return laatsteIndexPerSleutel.get(`${rij.bron}::${rij.adres_sleutel}::${rij.verkoopdatum}`) === i
  })
}

/** Vult ontbrekende (null/undefined) velden van `realworksRij` aan uit `brainbayRij`. Realworks-waarden hebben altijd voorrang. */
function vulAanUitBrainbay<T extends OntdubbelKern>(realworksRij: T, brainbayRij: T): { rij: T; aangevuldeVelden: string[] } {
  const rij: T = { ...realworksRij }
  const aangevuldeVelden: string[] = []
  for (const key of Object.keys(brainbayRij) as (keyof T)[]) {
    const realworksWaarde = realworksRij[key]
    const brainbayWaarde = brainbayRij[key]
    if ((realworksWaarde === null || realworksWaarde === undefined) && brainbayWaarde !== null && brainbayWaarde !== undefined) {
      rij[key] = brainbayWaarde
      aangevuldeVelden.push(String(key))
    }
  }
  return { rij, aangevuldeVelden }
}

export function ontdubbel<T extends OntdubbelKern>(rijen: T[]): OntdubbelResultaat<T> {
  const gededupliceerd = ontdubbelBinnenBron(rijen)

  const realworksRijen = gededupliceerd.filter(r => r.bron === 'realworks')
  const brainbayRijen = gededupliceerd.filter(r => r.bron === 'brainbay')
  const overigeRijen = gededupliceerd.filter(r => r.bron !== 'realworks' && r.bron !== 'brainbay')

  const brainbayPool = brainbayRijen.map(rij => ({ rij, gebruikt: false }))

  const resultaat: T[] = []
  const voorbeelden: OntdubbelVoorbeeld[] = []
  let samengevoegd = 0

  for (const rwRij of realworksRijen) {
    let beste: { entry: (typeof brainbayPool)[number]; dagen: number } | null = null
    if (rwRij.verkoopdatum) {
      for (const entry of brainbayPool) {
        if (entry.gebruikt || entry.rij.adres_sleutel !== rwRij.adres_sleutel || !entry.rij.verkoopdatum) continue
        const dagen = dagVerschil(rwRij.verkoopdatum, entry.rij.verkoopdatum)
        if (dagen <= VENSTER_DAGEN && (!beste || dagen < beste.dagen)) beste = { entry, dagen }
      }
    }

    if (beste) {
      beste.entry.gebruikt = true
      const { rij, aangevuldeVelden } = vulAanUitBrainbay(rwRij, beste.entry.rij)
      resultaat.push(rij)
      samengevoegd++
      if (voorbeelden.length < MAX_VOORBEELDEN) {
        voorbeelden.push({
          adresSleutel: rwRij.adres_sleutel,
          verkoopdatumRealworks: rwRij.verkoopdatum,
          verkoopdatumBrainbay: beste.entry.rij.verkoopdatum,
          aangevuldeVelden,
        })
      }
    } else {
      resultaat.push(rwRij)
    }
  }

  for (const entry of brainbayPool) {
    if (!entry.gebruikt) resultaat.push(entry.rij)
  }
  resultaat.push(...overigeRijen)

  return { rijen: resultaat, samengevoegd, voorbeelden }
}
