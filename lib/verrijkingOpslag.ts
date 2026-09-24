import { VerrijkingOpslagSchema, type VerrijkingOpslag, type MarktEigenData } from './schemas'
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
 * Verwerkt het resultaat van een losse `objecten.verrijking_json`-select tot
 * een gevalideerde opslag, of `null` bij elke vorm van falen. Pure functie
 * (geen eigen database-aanroep) — expres gescheiden van de query zelf, zodat
 * ze los te testen is zonder de Supabase-clienttypes te hoeven nabouwen.
 *
 * Bedoeld voor een losse query t.o.v. de hoofd-objectselect in
 * `app/(app)/object/[id]/page.tsx`: zolang de migratie
 * `20260923_object_verrijking.sql` niet is toegepast bestaat de kolom niet en
 * geeft die losse query een `error` (Postgres/PostgREST-foutcode 42703,
 * undefined_column) terug i.p.v. de hele paginaquery te breken — deze functie
 * behandelt dat gewoon als "nog geen buurtdata". Zie ook de graceful
 * afhandeling in `app/api/object/[id]/verrijking/route.ts`.
 */
export function verwerkOpgeslagenVerrijking(resultaat: { data: unknown; error: unknown } | null | undefined): VerrijkingOpslag | null {
  if (!resultaat || resultaat.error || !resultaat.data) return null

  const ruw = (resultaat.data as { verrijking_json?: unknown }).verrijking_json
  if (!ruw) return null

  const parsed = VerrijkingOpslagSchema.safeParse(ruw)
  return parsed.success ? parsed.data : null
}
