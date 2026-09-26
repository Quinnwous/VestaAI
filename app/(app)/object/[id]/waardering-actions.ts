'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import {
  dataTotEnMet,
  haalRegionaleSet,
  haalTransactiesOpId,
  referentiesInStraal,
  zoekTransacties,
  type DataTotEnMet,
} from '@/lib/transactiesQuery'
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
import { haalWozIjkpunt } from '@/lib/verrijking'
import { wozUitInvoer } from '@/lib/woz'
import { plaatsUitAdres } from '@/lib/transactieNormalisatie'
import { plaatsenGelijk } from '@/lib/kerncijfers'
import { KantoorInstellingenSchema, PropertyInputSchema, WaarderingOpslagSchema, type PropertyInput } from '@/lib/schemas'

type Correctie = { waarde: number; motivatie: string; datum: string }
type Result = { ok: true } | { ok: false; error: string }

/**
 * Gedeelde auth/opzoek-stap voor de handmatig-acties hieronder (item 4.4):
 * ingelogd, hoort bij een kantoor, dossier bestaat en hoort bij dat kantoor.
 * Retourneert de service-client (voor de update) en de huidige
 * `waardering_json` — de aanroeper migreert die zelf met `migreerWaarderingJson`.
 */
async function laadWaarderingContext(
  objectId: string,
): Promise<{ ok: true; service: ReturnType<typeof createServiceSupabaseClient>; waarderingJson: unknown } | { ok: false; error: string }> {
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

  return { ok: true, service, waarderingJson: object.waardering_json }
}

/** Slaat een bijgewerkte `handmatig`-selectie op, met dezelfde validatie als de rest van dit bestand. */
async function bewaarHandmatig(objectId: string, handmatig: WaarderingOpslag['handmatig']): Promise<Result> {
  const ctx = await laadWaarderingContext(objectId)
  if (!ctx.ok) return ctx
  const bestaand = migreerWaarderingJson(ctx.waarderingJson)
  const opslag: WaarderingOpslag = { ...bestaand, handmatig }
  const geparsd = WaarderingOpslagSchema.safeParse(opslag)
  if (!geparsd.success) return { ok: false, error: 'Kon de referentieselectie niet opslaan (ongeldig datacontract)' }
  const { error } = await ctx.service.from('objecten').update({ waardering_json: geparsd.data }).eq('id', objectId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/object/${objectId}`)
  return { ok: true }
}

/**
 * Sluit een (automatisch geselecteerde) referentie uit — item 4.4. Werkt via
 * `waardering_json.handmatig.uitgesloten`, dat `kiesReferenties()` als filter
 * gebruikt vóór de selectie (lib/waardering.ts). Voor een handmatig
 * tóégevoegde referentie werkt dit niet (die omzeilt `kiesReferenties()`
 * bewust) — gebruik daarvoor `verwijderToegevoegdeReferentie`.
 */
export async function sluitReferentieUit(objectId: string, referentieId: string): Promise<Result> {
  const ctx = await laadWaarderingContext(objectId)
  if (!ctx.ok) return ctx
  const bestaand = migreerWaarderingJson(ctx.waarderingJson)
  const uitgesloten = Array.from(new Set([...bestaand.handmatig.uitgesloten, referentieId]))
  return bewaarHandmatig(objectId, { ...bestaand.handmatig, uitgesloten })
}

/** Herstelt een eerder uitgesloten automatische referentie. */
export async function herstelReferentie(objectId: string, referentieId: string): Promise<Result> {
  const ctx = await laadWaarderingContext(objectId)
  if (!ctx.ok) return ctx
  const bestaand = migreerWaarderingJson(ctx.waarderingJson)
  const uitgesloten = bestaand.handmatig.uitgesloten.filter(id => id !== referentieId)
  return bewaarHandmatig(objectId, { ...bestaand.handmatig, uitgesloten })
}

/**
 * Voegt transacties toe als handmatige referentie (item 4.4) — gebruikt door
 * zowel de Drawer in `WaardebepalingPaneel` als de knop "meenemen als
 * referentie" in `TransactiesZoeken.tsx`. Idempotent (Set).
 */
export async function voegReferentiesToe(objectId: string, transactieIds: string[]): Promise<Result> {
  if (transactieIds.length === 0) return { ok: true }
  const ctx = await laadWaarderingContext(objectId)
  if (!ctx.ok) return ctx
  const bestaand = migreerWaarderingJson(ctx.waarderingJson)
  const toegevoegd = Array.from(new Set([...bestaand.handmatig.toegevoegd, ...transactieIds]))
  return bewaarHandmatig(objectId, { ...bestaand.handmatig, toegevoegd })
}

/** Verwijdert een handmatig toegevoegde referentie weer (haalt hem uit `handmatig.toegevoegd`). */
export async function verwijderToegevoegdeReferentie(objectId: string, transactieId: string): Promise<Result> {
  const ctx = await laadWaarderingContext(objectId)
  if (!ctx.ok) return ctx
  const bestaand = migreerWaarderingJson(ctx.waarderingJson)
  const toegevoegd = bestaand.handmatig.toegevoegd.filter(id => id !== transactieId)
  return bewaarHandmatig(objectId, { ...bestaand.handmatig, toegevoegd })
}

/**
 * Zoekt kandidaten voor de "referentie toevoegen"-drawer (item 4.4) via
 * `zoekTransacties()` (lib/transactiesQuery.ts, RLS regelt de
 * kantoorscheiding) — geen los adres-filter in `TransactieFilterSchema`, dus
 * we halen een ruime, op werkgebied afgebakende set op (recentste eerst) en
 * filteren op adres client-side/hier, net als de kit-prototypes dat met hun
 * synthetische kandidatenlijst deden. Geen coördinaten (zie
 * `haalTransactiesOpId` hierboven) — resultaten tonen dus geen afstand.
 */
export async function zoekWaarderingReferenties(
  objectId: string,
  zoekterm: string,
): Promise<{ ok: true; kandidaten: Kandidaat[] } | { ok: false; error: string }> {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  if (!makelaar) return { ok: false, error: 'Geen rechten' }

  const service = createServiceSupabaseClient()
  const [{ data: object }, { data: kantoor }] = await Promise.all([
    service.from('objecten').select('address').eq('id', objectId).eq('kantoor_id', makelaar.kantoor_id).single(),
    service.from('kantoren').select('instellingen_json').eq('id', makelaar.kantoor_id).single(),
  ])
  if (!object) return { ok: false, error: 'Woning niet gevonden' }

  const instellingenGeparsd = KantoorInstellingenSchema.safeParse(kantoor?.instellingen_json ?? {})
  const werkgebied = instellingenGeparsd.success ? (instellingenGeparsd.data.werkgebied?.plaatsen ?? []) : []

  try {
    const { rijen } = await zoekTransacties(
      supabase,
      werkgebied.length ? { plaatsen: werkgebied } : undefined,
      { sortering: 'verkoopdatum_desc', limiet: 60 },
    )
    const q = zoekterm.trim().toLowerCase()
    const gefilterd = q ? rijen.filter(r => r.adres.toLowerCase().includes(q)) : rijen
    const kandidaten: Kandidaat[] = gefilterd.slice(0, 20).map(r => ({
      id: r.id,
      adres: r.adres,
      plaats: r.plaats,
      woningtype_groep: r.woningtype_groep as Kandidaat['woningtype_groep'],
      woningtype_sub: r.woningtype_sub,
      verkoopprijs: r.verkoopprijs,
      woonoppervlak_m2: r.woonoppervlak_m2,
      bouwjaar: r.bouwjaar,
      verkoopdatum: r.verkoopdatum,
      garage: r.garage,
      tuin: r.tuin,
      energielabel: r.energielabel,
      verkopend_kantoor: r.verkopend_kantoor,
    }))
    return { ok: true, kandidaten }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Kon niet zoeken' }
  }
}

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
      /** Opgeslagen `handmatig.uitgesloten`-ids (item 4.4) — seed voor de client-state. */
      handmatigUitgesloten: string[]
      /** Opgeslagen `handmatig.toegevoegd`-ids, opgelost naar volledige kandidaten (item 4.4). */
      handmatigToegevoegd: Kandidaat[]
      /** WOZ-ijkpunt (§ 3.3) — nooit als invoer, puur een referentiegetal náást de waarde. */
      woz: { waarde: number; peildatum: string } | null
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

  const bestaandeOpslag = migreerWaarderingJson(object.waardering_json)

  // Handmatig toegevoegde referenties (item 4.4) zijn opgeslagen als ids —
  // hier opgelost naar volledige kandidaten, zodat berekenWaarderingV2() ze
  // kan meenemen. Handmatig-uitgesloten ids gaan als filter mee in
  // kiesReferenties() (lib/waardering.ts) — dat gebeurt al binnen de functie.
  // WOZ (§ 3.3) is een los, niet-kritiek ijkpunt: een mislukte opzoeking mag
  // de waardering nooit blokkeren.
  const [dataTm, handmatigToegevoegd, woz] = await Promise.all([
    dataTotEnMet(supabase),
    bestaandeOpslag.handmatig.toegevoegd.length ? haalTransactiesOpId(supabase, bestaandeOpslag.handmatig.toegevoegd) : Promise.resolve([]),
    // Door de makelaar ingevulde WOZ gaat voor (lib/woz.ts); de automatische
    // opzoeking is niet gekoppeld (lib/verrijking.ts fetchWoz).
    wozUitInvoer(invoer) ?? haalWozIjkpunt(object.address).catch(() => null),
  ])

  const uitkomst = berekenWaarderingV2(subject, kandidaten, {
    regionaal,
    cbs: CBS_INDEX_REEKS,
    correcties: opties.correcties,
    handmatig: { uitgesloten: bestaandeOpslag.handmatig.uitgesloten, toegevoegd: handmatigToegevoegd },
    woz,
  })

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

  return {
    ok: true,
    subject,
    kandidaten,
    regionaal,
    cbs: CBS_INDEX_REEKS,
    dataTm,
    uitkomst,
    correctie: bestaandeOpslag.correctie,
    handmatigUitgesloten: bestaandeOpslag.handmatig.uitgesloten,
    handmatigToegevoegd,
    woz,
  }
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
