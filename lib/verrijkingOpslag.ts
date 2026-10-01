import { VerrijkingOpslagSchema, type VerrijkingOpslag, type MarktEigenData, type BronMeta, type FetchStatus } from './schemas'
import type { VerrijkingData } from './verrijking'

/**
 * Bouwt de opslagvorm van een verse `fetchVerrijking()`-uitkomst (item 10.3):
 * voegt de schemaversie en het tijdstip "opgehaald op" toe en valideert het
 * geheel via Zod, zodat een onverwachte vorm (bv. een latere wijziging in
 * lib/verrijking.ts) meteen opvalt i.p.v. stilzwijgend een kapotte rij op te
 * slaan. Pure functie — geen netwerk/database, dus los te testen.
 *
 * `marktEigen` komt niet uit `fetchVerrijking()` zelf (die levert het
 * vuistregel-marktblok voor de Claude-prompt, zie lib/verrijking.ts `markt`)
 * maar wordt door de aanroeper (de route) apart opgehaald via
 * `marktanalyseSamenvatting()` op de eigen transactiedataset — zie het
 * schemacommentaar bij `MarktEigenDataSchema` in lib/schemas.ts voor waarom.
 */
export function naarVerrijkingOpslag(data: VerrijkingData, opgehaaldOp: string, marktEigen: MarktEigenData | null): VerrijkingOpslag {
  return VerrijkingOpslagSchema.parse({
    versie: 1,
    woz: data.woz,
    cbs: data.cbs,
    voorzieningen: data.voorzieningen,
    marktEigen,
    gemeente: data.gemeente,
    coord: data.coord,
    bronnen: data.bronnen,
    opgehaald_op: opgehaaldOp,
  })
}

/**
 * Verwerkt het resultaat van een losse `objecten.verrijking_json`-select
 * (kolom live sinds migratie `20260923_object_verrijking.sql`, 23 sep 2026)
 * tot een gevalideerde opslag, of `null` bij elke vorm van falen — geen rij,
 * een querfout, of data die niet aan het schema voldoet. Pure functie (geen
 * eigen database-aanroep) — expres gescheiden van de query zelf, zodat ze los
 * te testen is zonder de Supabase-clienttypes te hoeven nabouwen.
 *
 * Bedoeld voor een losse query t.o.v. de hoofd-objectselect in
 * `app/(app)/object/[id]/page.tsx`, zodat een querfout die query nooit de
 * hele paginaquery laat breken.
 */
export function verwerkOpgeslagenVerrijking(resultaat: { data: unknown; error: unknown } | null | undefined): VerrijkingOpslag | null {
  if (!resultaat || resultaat.error || !resultaat.data) return null

  const ruw = (resultaat.data as { verrijking_json?: unknown }).verrijking_json
  if (!ruw) return null

  const parsed = VerrijkingOpslagSchema.safeParse(ruw)
  return parsed.success ? parsed.data : null
}

/** Uitkomst van `voegBronSamen()` hieronder: de data + status die uiteindelijk worden
 *  opgeslagen voor één bron, plus de metadata die onthoudt wanneer die data écht is
 *  opgehaald en of de laatste verversing daarna nog eens mislukte. */
interface BronUitkomst<T> {
  data: T | null
  status: FetchStatus
  meta: BronMeta
}

/**
 * Samenvoegregel voor één bron (item 12.9): mislukt de nieuwe poging terwijl de
 * vorige opslag voor deze bron `ok` was mét data, dan blijft die vorige data
 * staan — met de datum waarop die écht is opgehaald (niet het tijdstip van deze
 * mislukte poging) en een vlag dat de laatste verversing mislukte. In alle
 * andere gevallen (de nieuwe poging slaagt, of er was ook vorige keer al niets
 * goeds) wint de nieuwe uitkomst gewoon.
 *
 * `laatste_verversing_mislukt` is bewust alléén `true` in de eerste tak: het
 * vlagt specifiek "de data die hier als `ok` wordt getoond is ouder dan je
 * zou verwachten". Komt de nieuwe status zelf door (ook als die `leeg` of
 * `niet_gekoppeld` is, bv. WOZ dat structureel niet gekoppeld is), dan toont
 * `BuurtDataTab.tsx` toch al de eerlijke melding voor die status — geen losse
 * "verversen mislukte"-banner nodig voor iets dat geen mislukking is.
 */
function voegBronSamen<T>(
  vorige: { data: T | null; status: FetchStatus | undefined; meta: BronMeta | undefined; opgehaaldOp: string },
  nieuw: { data: T | null; status: FetchStatus; opgehaaldOp: string },
): BronUitkomst<T> {
  if (nieuw.status !== 'ok' && vorige.status === 'ok' && vorige.data != null) {
    return {
      data: vorige.data,
      status: 'ok',
      meta: {
        opgehaald_op: vorige.meta?.opgehaald_op ?? vorige.opgehaaldOp,
        laatste_verversing_mislukt: true,
      },
    }
  }
  return {
    data: nieuw.data,
    status: nieuw.status,
    meta: { opgehaald_op: nieuw.opgehaaldOp, laatste_verversing_mislukt: false },
  }
}

/**
 * Voegt een verse `naarVerrijkingOpslag()`-uitkomst samen met de vorige opslag
 * (item 12.9, gevonden 1 okt 2026 — "Ververs" overschreef `verrijking_json`
 * altijd in zijn geheel; faalde Overpass op dat moment, dan was goede data
 * domweg weg bij Haagweg 102 en Rembrandtlaan 14). Per bron (woz, cbs,
 * voorzieningen): mislukt de verversing en was de vorige data goed, dan blijft
 * die staan (zie `voegBronSamen()`). `marktEigen`, `gemeente` en `coord` zijn
 * geen bron met een eigen fetch-status (item 10.3-fix) — die nemen we gewoon
 * van de nieuwe poging over, net als vóór deze fix.
 *
 * Geen vorige opslag (nieuw dossier) → de nieuwe opslag ongewijzigd terug.
 * Pure functie — geen netwerk/database, dus los te testen.
 */
export function voegVerrijkingSamen(vorige: VerrijkingOpslag | null, nieuw: VerrijkingOpslag): VerrijkingOpslag {
  if (!vorige) return nieuw

  // `nieuw` komt altijd vers uit `naarVerrijkingOpslag()`, die `bronnen` altijd
  // vult (VerrijkingData vereist het) — maar het schema laat het optioneel voor
  // oudere rijen. Zonder dat veld is er niets te onderscheiden; dan telt alles
  // als 'mislukt' zodat we nooit per ongeluk vorige data weggooien.
  const nieuweBronnen = nieuw.bronnen ?? { woz: 'mislukt' as const, cbs: 'mislukt' as const, voorzieningen: 'mislukt' as const }

  const woz = voegBronSamen(
    { data: vorige.woz, status: vorige.bronnen?.woz, meta: vorige.bronMeta?.woz, opgehaaldOp: vorige.opgehaald_op },
    { data: nieuw.woz, status: nieuweBronnen.woz, opgehaaldOp: nieuw.opgehaald_op },
  )
  const cbs = voegBronSamen(
    { data: vorige.cbs, status: vorige.bronnen?.cbs, meta: vorige.bronMeta?.cbs, opgehaaldOp: vorige.opgehaald_op },
    { data: nieuw.cbs, status: nieuweBronnen.cbs, opgehaaldOp: nieuw.opgehaald_op },
  )
  const voorzieningen = voegBronSamen(
    { data: vorige.voorzieningen, status: vorige.bronnen?.voorzieningen, meta: vorige.bronMeta?.voorzieningen, opgehaaldOp: vorige.opgehaald_op },
    { data: nieuw.voorzieningen, status: nieuweBronnen.voorzieningen, opgehaaldOp: nieuw.opgehaald_op },
  )

  return VerrijkingOpslagSchema.parse({
    ...nieuw,
    // Gemeente en coördinaat komen uit PDOK; levert die bij verversen niets op
    // (uitval), dan de vorige waarde houden — het adres is niet veranderd.
    gemeente: nieuw.gemeente ?? vorige.gemeente,
    coord: nieuw.coord ?? vorige.coord,
    woz: woz.data,
    cbs: cbs.data,
    voorzieningen: voorzieningen.data,
    bronnen: { woz: woz.status, cbs: cbs.status, voorzieningen: voorzieningen.status },
    bronMeta: { woz: woz.meta, cbs: cbs.meta, voorzieningen: voorzieningen.meta },
  })
}
