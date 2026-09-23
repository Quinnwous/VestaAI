import { VerrijkingOpslagSchema, type VerrijkingOpslag } from './schemas'
import type { VerrijkingData } from './verrijking'
import type { createServiceSupabaseClient } from './supabase'

type ServiceClient = ReturnType<typeof createServiceSupabaseClient>

/**
 * Bouwt de opslagvorm van een verse `fetchVerrijking()`-uitkomst (item 10.3):
 * voegt de schemaversie en het tijdstip "opgehaald op" toe en valideert het
 * geheel via Zod, zodat een onverwachte vorm (bv. een latere wijziging in
 * lib/verrijking.ts) meteen opvalt i.p.v. stilzwijgend een kapotte rij op te
 * slaan. Pure functie — geen netwerk/database, dus los te testen.
 */
export function naarVerrijkingOpslag(data: VerrijkingData, opgehaaldOp: string): VerrijkingOpslag {
  return VerrijkingOpslagSchema.parse({
    versie: 1,
    woz: data.woz,
    cbs: data.cbs,
    voorzieningen: data.voorzieningen,
    markt: data.markt,
    gemeente: data.gemeente,
    coord: data.coord,
    opgehaald_op: opgehaaldOp,
  })
}

/**
 * Leest de opgeslagen verrijking van een dossier, los van de hoofd-objectselect
 * in `app/(app)/object/[id]/page.tsx`. Losstaand zodat de migratie
 * `20260923_object_verrijking.sql` niet toegepast hoeft te zijn om de rest van
 * het dossier te tonen: zolang de kolom `objecten.verrijking_json` niet
 * bestaat faalt alléén déze losse query (Postgres/PostgREST-foutcode 42703,
 * undefined_column) en behandelen we het dossier gewoon als "nog geen
 * buurtdata" — zie ook de graceful afhandeling in
 * `app/api/object/[id]/verrijking/route.ts`.
 */
export async function haalOpgeslagenVerrijking(
  client: Pick<ServiceClient, 'from'>,
  objectId: string,
): Promise<VerrijkingOpslag | null> {
  try {
    const { data, error } = await client
      .from('objecten')
      .select('verrijking_json')
      .eq('id', objectId)
      .single()
    if (error || !data) return null

    const ruw = (data as { verrijking_json: unknown }).verrijking_json
    if (!ruw) return null

    const parsed = VerrijkingOpslagSchema.safeParse(ruw)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Weergave — nl-NL opmaak voor components/BuurtDataTab.tsx. `lib/opmaak.ts`
// bestond nog niet op het moment dat dit item werd gebouwd (roadmap v2 item
// 6.1, elders in ontwikkeling) — vandaar deze lokale, kleine helpers i.p.v.
// losse `.toLocaleString()`-aanroepen door de hele tab. Bij samenvoegen met
// item 6.1: verhuizen naar `lib/opmaak.ts` en hier hergebruiken.
//
// De datum/tijd-formatters pinnen expliciet `timeZone: 'Europe/Amsterdam'` —
// zonder dat zou de servergerenderde HTML (Vercel, UTC) rond middernacht een
// andere kalenderdag tonen dan de clienthydratie (Europe/Amsterdam), dezelfde
// categorie hydratiemismatch als de `new Date()`-les in CLAUDE.md.
// ---------------------------------------------------------------------------

const EURO_FMT = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const GETAL_FMT = new Intl.NumberFormat('nl-NL')
const KM_FMT = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 })
const OPGEHAALD_OP_FMT = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  timeZone: 'Europe/Amsterdam',
})

export function formatEuro(bedrag: number): string {
  return EURO_FMT.format(bedrag)
}

export function formatGetal(n: number): string {
  return GETAL_FMT.format(n)
}

/** "450 m" onder de 1 km, anders "1,2 km". */
export function formatAfstand(meters: number): string {
  if (meters >= 1000) return `${KM_FMT.format(meters / 1000)} km`
  return `${GETAL_FMT.format(meters)} m`
}

/** "onbekend" bij een ongeldige/ontbrekende tijdstempel — nooit een rauwe "Invalid Date". */
export function formatOpgehaaldOp(iso: string): string {
  const datum = new Date(iso)
  if (Number.isNaN(datum.getTime())) return 'onbekend'
  return OPGEHAALD_OP_FMT.format(datum)
}
