'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { dataTotEnMet, haalRegionaleSet, referentiesInStraal, type DataTotEnMet } from '@/lib/transactiesQuery'
import {
  berekenWaarderingV2,
  LADDER,
  migreerWaarderingJson,
  type CorrectiesAan,
  type Kandidaat,
  type SubjectV2,
  type WaarderingOpslag,
  type WaarderingUitkomst,
} from '@/lib/waardering'
import { CBS_INDEX_REEKS, type CbsIndexReeks } from '@/lib/cbsPrijsindex'
import { plaatsUitAdres } from '@/lib/transactieNormalisatie'
import { plaatsenGelijk } from '@/lib/kerncijfers'
import { KantoorInstellingenSchema, PropertyInputSchema, WaarderingOpslagSchema, type PropertyInput } from '@/lib/schemas'

type Correctie = { waarde: number; motivatie: string; datum: string }
type Result = { ok: true } | { ok: false; error: string }

/** Maximale straal uit de verbredingsladder (§ 3.3) — de kandidaatophaal-radius; `kiesReferenties()` past de ladder daarbinnen zelf toe. */
const MAX_STRAAL_M = LADDER[LADDER.length - 1].straal_m

/**
 * Plaats uit het adres, gecanonicaliseerd naar de spelling van het werkgebied
 * (dus ook van de transactiedataset: `transacties.plaats` en het werkgebied
 * komen uit dezelfde admin-invoer). Zonder normalisatie zou een dossieradres
 * "Den Haag" nooit matchen met dataset-rijen die "'s-Gravenhage" heten (zie
 * `lib/kerncijfers.ts` `plaatsenGelijk`, item 2.5, hetzelfde spellingsverschil)
 * — dan telt `plaatsFactorVoor()` in `lib/waardering.ts` elke referentie in de
 * eigen stad ten onrechte als "andere plaats" (halveert het gewicht), en zou
 * de plaats-terugval zonder locatie zelfs 0 kandidaten vinden.
 */
function canoniekePlaats(ruw: string | null, werkgebied: string[]): string | null {
  if (!ruw) return null
  return werkgebied.find(w => plaatsenGelijk(w, ruw)) ?? ruw
}

/**
 * Bouwt het `SubjectV2` uit een dossier (item 4.1, docs/roadmap.md § 3.3):
 * woningtype-groep/subtype en oppervlak/bouwjaar rechtstreeks uit de intake,
 * lat/lng uit het dossier zelf (verrijking bij aanmaken, zie § 3.2),
 * garage/tuin afgeleid zoals `app/(app)/object/[id]/page.tsx` dat deed vóór
 * v2, plaats uit het adres (`plaatsUitAdres`, gecanonicaliseerd naar het
 * werkgebied) als terugval zonder lat/lng.
 */
function naarSubject(invoer: PropertyInput, object: { lat: number | null; lng: number | null; address: string }, werkgebied: string[]): SubjectV2 {
  const heeftGarage = !!invoer.ligging_buitenruimte?.garage_parkeren && invoer.ligging_buitenruimte.garage_parkeren !== 'geen'
  const heeftTuin = !!invoer.ligging_buitenruimte?.tuin_m2 && invoer.ligging_buitenruimte.tuin_m2 > 0
  return {
    woningtype_groep: invoer.woningtype_groep,
    woningtype_sub: invoer.woningtype_sub ?? null,
    oppervlak_m2: invoer.oppervlak_m2,
    bouwjaar: invoer.bouwjaar,
    lat: object.lat,
    lng: object.lng,
    plaats: canoniekePlaats(plaatsUitAdres(object.address), werkgebied),
    garage: heeftGarage,
    tuin: heeftTuin,
    energielabel: invoer.energielabel ?? null,
  }
}

export type WaarderingBerekeningResultaat =
  | {
      ok: true
      subject: SubjectV2
      kandidaten: Kandidaat[]
      regionaal: Kandidaat[] | undefined
      cbs: CbsIndexReeks
      dataTm: DataTotEnMet
      uitkomst: WaarderingUitkomst
      correctie: Correctie | null
    }
  | { ok: false; error: string }

/**
 * "Bereken waardering" (item 4.1/4.2/4.3, docs/roadmap.md § 3.3): haalt het
 * dossier op, bouwt het subject, haalt kandidaten + regionale set via de
 * sessie-gebonden client (`lib/transactiesQuery.ts`, RLS regelt de
 * kantoorscheiding), rekent met `berekenWaarderingV2()` en slaat de uitkomst
 * op in `objecten.waardering_json` (v2, bestaande makelaarscorrectie en
 * handmatige selectie blijven behouden). Geeft ook de ruwe kandidaten/
 * regionale set/cbs-reeks terug zodat het paneel de wat-als-schakelaars
 * (item 4.5) client-side kan herberekenen met `berekenWaarderingV2()` —
 * puur, dus zonder een nieuwe serveraanroep per schakelaar.
 *
 * Zonder lat/lng (verrijking bij aanmaken mislukt) valt de kandidaatophaal
 * terug op de regionale set (plaats + typegroep, 60 maanden terug — de
 * volle reikwijdte van de verbredingsladder); `kiesReferenties()` binnen
 * `berekenWaarderingV2` herkent het ontbreken van locatie zelf en meldt de
 * waarschuwing "zonder locatie".
 *
 * We geven de eigen regionale prijsindex bewust niet expliciet mee
 * (`opties.index`): zonder die parameter bouwt `berekenWaarderingV2` de
 * index zelf via `bouwIndex()` op `regionaal` — en `regionaal` is al
 * gefilterd op werkgebied + typegroep, exact de "prijsindex_kwartaal
 * (werkgebied, typegroep)" uit § 3.3. De RPC `prijsindex_kwartaal` filtert
 * alleen op subtype (`typen`), niet op groep, dus zou hier juist een minder
 * precieze index opleveren; de backtest (item 4.8, `scripts/backtest-waardering.mjs`)
 * rekent op dezelfde manier (geen `opties.index`), dus dit houdt productie en
 * backtest gelijk.
 */
export async function berekenWaardering(
  objectId: string,
  opties: { correcties?: CorrectiesAan } = {},
): Promise<WaarderingBerekeningResultaat> {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  if (!makelaar) return { ok: false, error: 'Geen rechten' }

  const service = createServiceSupabaseClient()
  const [{ data: object }, { data: kantoor }] = await Promise.all([
    service
      .from('objecten')
      .select('address, lat, lng, input_json, waardering_json')
      .eq('id', objectId)
      .eq('kantoor_id', makelaar.kantoor_id)
      .single(),
    service.from('kantoren').select('instellingen_json').eq('id', makelaar.kantoor_id).single(),
  ])
  if (!object) return { ok: false, error: 'Woning niet gevonden' }

  const parsedInvoer = PropertyInputSchema.safeParse(object.input_json)
  const invoer = parsedInvoer.success ? parsedInvoer.data : (object.input_json as PropertyInput)

  const instellingenGeparsd = KantoorInstellingenSchema.safeParse(kantoor?.instellingen_json ?? {})
  const werkgebiedKantoor = instellingenGeparsd.success ? (instellingenGeparsd.data.werkgebied?.plaatsen ?? []) : []

  const subject = naarSubject(invoer, object, werkgebiedKantoor)
  const werkgebied = werkgebiedKantoor.length ? werkgebiedKantoor : subject.plaats ? [subject.plaats] : []

  const heeftLocatie = subject.lat != null && subject.lng != null
  let kandidaten: Kandidaat[] = []
  let regionaal: Kandidaat[] | undefined

  try {
    if (heeftLocatie) {
      const [k, r] = await Promise.all([
        referentiesInStraal(supabase, { lat: subject.lat!, lng: subject.lng!, straalM: MAX_STRAAL_M }),
        werkgebied.length ? haalRegionaleSet(supabase, werkgebied, subject.woningtype_groep) : Promise.resolve(undefined),
      ])
      kandidaten = k
      regionaal = r
    } else if (werkgebied.length) {
      // Zonder locatie is er geen straal om te bevragen — de regionale set
      // (plaats + typegroep, 60 maanden i.p.v. de standaard 36 — de volle
      // reikwijdte van de verbredingsladder) dient zowel als kandidatenpool
      // als regionale set; kiesReferenties() valt zelf terug op de
      // plaats-methode omdat subject.lat/lng ontbreken.
      kandidaten = await haalRegionaleSet(supabase, werkgebied, subject.woningtype_groep, { maanden: 60 })
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Kon referenties niet ophalen' }
  }

  const dataTm = await dataTotEnMet(supabase)

  const uitkomst = berekenWaarderingV2(subject, kandidaten, {
    regionaal,
    cbs: CBS_INDEX_REEKS,
    correcties: opties.correcties,
  })

  const bestaandeOpslag = migreerWaarderingJson(object.waardering_json)
  const opslag: WaarderingOpslag = {
    versie: 2,
    uitkomst,
    correctie: bestaandeOpslag.correctie,
    handmatig: bestaandeOpslag.handmatig,
  }
  const geparsd = WaarderingOpslagSchema.safeParse(opslag)
  if (!geparsd.success) return { ok: false, error: 'Kon de waarderingsuitkomst niet opslaan (ongeldig datacontract)' }

  const { error } = await service.from('objecten').update({ waardering_json: geparsd.data }).eq('id', objectId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/object/${objectId}`)

  return { ok: true, subject, kandidaten, regionaal, cbs: CBS_INDEX_REEKS, dataTm, uitkomst, correctie: bestaandeOpslag.correctie }
}

/**
 * Makelaar-correctie op de berekende waardebepaling (F7, besluit 16 sep
 * 2026): bijsturen mag, maar altijd met een motivatie — die gaat mee het
 * verkoopadvies in en is voor Quinn terug te zien om te toetsen waar het
 * model structureel misziet. Migreert v1-json (`{ correctie }`) automatisch
 * naar v2 (`migreerWaarderingJson`), zodat een dossier dat nog geen
 * `berekenWaardering()`-aanroep gehad heeft niet corrupt raakt.
 */
export async function slaWaarderingCorrectieOp(
  objectId: string, waarde: number, motivatie: string,
): Promise<Result & { correctie?: Correctie }> {
  if (!Number.isFinite(waarde) || waarde <= 0) return { ok: false, error: 'Ongeldige waarde' }
  if (!motivatie.trim()) return { ok: false, error: 'Geef een korte motivatie voor de bijstelling' }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  if (!makelaar) return { ok: false, error: 'Geen rechten' }

  const service = createServiceSupabaseClient()
  const { data: object } = await service
    .from('objecten')
    .select('waardering_json')
    .eq('id', objectId)
    .eq('kantoor_id', makelaar.kantoor_id)
    .single()
  if (!object) return { ok: false, error: 'Woning niet gevonden' }

  const bestaand = migreerWaarderingJson(object.waardering_json)
  const correctie: Correctie = { waarde: Math.round(waarde), motivatie: motivatie.trim().slice(0, 1000), datum: new Date().toISOString() }
  const opslag: WaarderingOpslag = { ...bestaand, correctie }

  const geparsd = WaarderingOpslagSchema.safeParse(opslag)
  if (!geparsd.success) return { ok: false, error: 'Kon de correctie niet opslaan (ongeldig datacontract)' }

  const { error } = await service.from('objecten').update({ waardering_json: geparsd.data }).eq('id', objectId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/object/${objectId}`)
  return { ok: true, correctie }
}

export async function verwijderWaarderingCorrectie(objectId: string): Promise<Result> {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  if (!makelaar) return { ok: false, error: 'Geen rechten' }

  const service = createServiceSupabaseClient()
  const { data: object } = await service
    .from('objecten')
    .select('waardering_json')
    .eq('id', objectId)
    .eq('kantoor_id', makelaar.kantoor_id)
    .single()
  if (!object) return { ok: false, error: 'Woning niet gevonden' }

  const bestaand = migreerWaarderingJson(object.waardering_json)
  const opslag: WaarderingOpslag = { ...bestaand, correctie: null }

  const geparsd = WaarderingOpslagSchema.safeParse(opslag)
  if (!geparsd.success) return { ok: false, error: 'Kon de correctie niet verwijderen (ongeldig datacontract)' }

  const { error } = await service.from('objecten').update({ waardering_json: geparsd.data }).eq('id', objectId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/object/${objectId}`)
  return { ok: true }
}
