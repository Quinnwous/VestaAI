/**
 * Verkoopadvies — datalaag (item K1, docs/specs/k1-verkoopadvies-datalaag.md).
 *
 * Fase 11 (verkoopadvies) is bewust geblokkeerd tot Quinns voorbeelddocument
 * er is: de opbouw en vormgeving van het advies zelf hangen daarvan af. Het
 * datacontract staat wél al vast — dat is wat dit bestand bouwt. Geen UI,
 * geen pdf, geen Claude-aanroep, geen teksten die de opbouw van het advies
 * vastleggen. Fase 11: het contract is stabiel; secties/pdf volgen op het
 * voorbeeld van Quinn.
 *
 * Alles hier is puur en herbruikt bestaande logica in plaats van iets
 * opnieuw te berekenen:
 * - de waardering komt uit `migreerWaarderingJson()` (lib/waardering.ts) —
 *   de uitkomst die al op het dossier staat, nooit herberekend (zelfde regel
 *   als `app/api/pdf/waardebepaling/route.ts`);
 * - de courtage komt uit `effectieveCourtage()` (lib/courtage.ts) —
 *   dossiervoorstel wint van de kantoorstandaard;
 * - de kantoorcontactgegevens komen uit `bouwBranding()` (lib/branding.ts);
 * - de marktcontext is het resultaat van `marktanalyseSamenvatting()`
 *   (lib/transactiesQuery.ts), door de server-loader hieronder opgehaald en
 *   hier alleen doorgegeven.
 */

import {
  PropertyInputSchema,
  type PropertyInput,
  type KantoorInstellingen,
} from './schemas'
import { migreerWaarderingJson, WEINIG_DATA_ONDER, type WaarderingOpslag } from './waardering'
import { effectieveCourtage, courtageLabel, type EffectieveCourtage } from './courtage'
import { bouwBranding, type WebsiteWeergave } from './branding'
import { canoniekePlaats, plaatsVarianten } from './plaatsNormalisatie'
import { subtypenVoorGroep, MIN_N_BETROUWBAAR } from './marktanalyse'
import { euro } from './opmaak'
import type { MarktanalyseSamenvatting } from './transactiesQuery'

// ─────────────────────────────────────────────────────────────────────────
// Het datacontract
// ─────────────────────────────────────────────────────────────────────────

export type VerkoopadviesKantoor = {
  naam: string
  website: WebsiteWeergave | null
  telefoon: string | null
  email: string | null
  /** Dossiervoorstel wint van de kantoorstandaard — zie lib/courtage.ts. */
  courtage: EffectieveCourtage
  /** "Over ons" — opgericht/lidmaatschappen/kenmerken, platform-admin-beheerd. */
  profiel: KantoorInstellingen['profiel'] | null
  /** Plaatsen waar het kantoor actief is, platform-admin-beheerd. */
  werkgebied: KantoorInstellingen['werkgebied'] | null
}

export type VerkoopadviesMakelaar = {
  naam: string
  email: string
}

/**
 * `VerkoopadviesInput = { dossier (intake), waardering (v2), kantoor
 * (instellingen: courtage, profiel, werkgebied), marktcontext
 * (marktanalyseSamenvatting voor plaats + typegroep), makelaar }` — het
 * contract uit de spec, ongewijzigd.
 */
export type VerkoopadviesInput = {
  dossier: PropertyInput
  waardering: WaarderingOpslag
  kantoor: VerkoopadviesKantoor
  /** `null` als de plaats niet uit het adres kon worden afgeleid, of de RPC niets teruggaf. */
  marktcontext: MarktanalyseSamenvatting | null
  makelaar: VerkoopadviesMakelaar
}

// ─────────────────────────────────────────────────────────────────────────
// bouwVerkoopadviesInput — puur: ruwe, al opgehaalde rijen → het contract
// ─────────────────────────────────────────────────────────────────────────

export type VerkoopadviesRuweInvoer = {
  /** `objecten.input_json` — ongevalideerd, wordt hier geparsed (`PropertyInputSchema`). */
  inputJson: unknown
  /** `objecten.waardering_json` — ongevalideerd, wordt hier gemigreerd (`migreerWaarderingJson`). */
  waarderingJson: unknown
  /** Kantoorrij voor `bouwBranding()` — naam, logo, huisstijl. */
  kantoor: { name?: string | null; logo_url?: string | null; huisstijl_json?: Record<string, unknown> | null } | null
  /** `kantoren.instellingen_json` — courtage/profiel/werkgebied, platform-admin-beheerd. */
  kantoorInstellingen: KantoorInstellingen | null
  /** Al opgehaalde marktcontext (RPC-resultaat van de server-loader hieronder). */
  marktcontext: MarktanalyseSamenvatting | null
  makelaar: VerkoopadviesMakelaar
}

/**
 * Van opgehaalde ruwe rijen naar het stabiele contract — puur, geen
 * database-toegang. Parst de intake, migreert de waarderingsopslag naar v2,
 * bouwt het merkpalet voor de kantoorcontactgegevens, en bepaalt de
 * effectieve courtage (dossiervoorstel wint van de kantoorstandaard).
 */
export function bouwVerkoopadviesInput(ruw: VerkoopadviesRuweInvoer): VerkoopadviesInput {
  const dossier = PropertyInputSchema.parse(ruw.inputJson)
  const waardering = migreerWaarderingJson(ruw.waarderingJson)
  const branding = bouwBranding(ruw.kantoor)
  const courtage = effectieveCourtage(dossier.courtagevoorstel_percentage, ruw.kantoorInstellingen)

  return {
    dossier,
    waardering,
    kantoor: {
      naam: branding.naam,
      website: branding.website,
      telefoon: branding.telefoon,
      email: branding.email,
      courtage,
      profiel: ruw.kantoorInstellingen?.profiel ?? null,
      werkgebied: ruw.kantoorInstellingen?.werkgebied ?? null,
    },
    marktcontext: ruw.marktcontext,
    makelaar: ruw.makelaar,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Marktcontext-filter — puur: welke plaats + typegroep hoort bij dit dossier
// (door de server-loader gebruikt vóór de `marktanalyseSamenvatting()`-call)
// ─────────────────────────────────────────────────────────────────────────

export type VerkoopadviesMarktcontextFilter = {
  /** `TransactieFilter.plaatsen` — schrijfwijze-varianten, zie plaatsVarianten(). */
  plaatsen: string[]
  /** `TransactieFilter.typen` — de RPC's filteren op `woningtype_sub`, dus alle subtypes van de groep. */
  typen: string[]
}

/**
 * Leidt plaats en typegroep van dit dossier af voor de marktcontext-RPC.
 * Plaats = het laatste, door een komma gescheiden onderdeel van het adres
 * ("Straat 1, 1234 AB, Plaats") — zelfde conventie als
 * `app/api/object/[id]/verrijking/route.ts`. `null` als er geen plaats valt
 * af te leiden (adres zonder komma's).
 */
export function verkoopadviesMarktcontextFilter(dossier: PropertyInput): VerkoopadviesMarktcontextFilter | null {
  const delen = dossier.adres.split(',')
  if (delen.length < 2) return null
  const ruwePlaats = delen[delen.length - 1].trim()
  if (!ruwePlaats) return null
  const plaats = canoniekePlaats(ruwePlaats)
  return {
    plaatsen: plaatsVarianten(plaats),
    typen: subtypenVoorGroep(dossier.woningtype_groep),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// verkoopadviesGereedheid — puur: is er genoeg om een verkoopadvies op te bouwen?
// ─────────────────────────────────────────────────────────────────────────

export type VerkoopadviesOnderdeel =
  | 'waardering'
  | 'courtage'
  | 'kantoorprofiel'
  | 'werkgebied'
  | 'marktcontext'
  | 'prijsverwachting_verkoper'
  | 'woz'

export type VerkoopadviesGereedheidStatus = 'ok' | 'ontbreekt' | 'zwak'

export type VerkoopadviesGereedheidItem = {
  onderdeel: VerkoopadviesOnderdeel
  status: VerkoopadviesGereedheidStatus
  uitleg: string
}

function waarderingGereedheid(waardering: WaarderingOpslag): VerkoopadviesGereedheidItem {
  const uitkomst = waardering.uitkomst
  if (!uitkomst) {
    return { onderdeel: 'waardering', status: 'ontbreekt', uitleg: 'Er is nog geen waardebepaling berekend voor dit dossier.' }
  }
  if (uitkomst.weinigData) {
    return {
      onderdeel: 'waardering',
      status: 'zwak',
      uitleg: `De waardebepaling steunt op maar ${uitkomst.n} referentie${uitkomst.n === 1 ? '' : 's'} (minder dan ${WEINIG_DATA_ONDER}) — de bandbreedte is daarom verbreed.`,
    }
  }
  return { onderdeel: 'waardering', status: 'ok', uitleg: `De waardebepaling steunt op ${uitkomst.n} referenties.` }
}

function courtageGereedheid(courtage: EffectieveCourtage): VerkoopadviesGereedheidItem {
  if (courtage.percentage == null) {
    return { onderdeel: 'courtage', status: 'ontbreekt', uitleg: 'Er is nog geen courtagepercentage — vul dit in bij het dossier of de kantoorstandaard.' }
  }
  const bronLabel = courtage.bron === 'dossier' ? 'het courtagevoorstel van dit dossier' : 'de kantoorstandaard'
  return { onderdeel: 'courtage', status: 'ok', uitleg: `${courtageLabel(courtage)}, afkomstig van ${bronLabel}.` }
}

function kantoorprofielGereedheid(profiel: KantoorInstellingen['profiel'] | null): VerkoopadviesGereedheidItem {
  const opgericht = profiel?.opgericht?.trim()
  const kenmerken = profiel?.kenmerken?.trim()
  if (!opgericht && !kenmerken) {
    return { onderdeel: 'kantoorprofiel', status: 'ontbreekt', uitleg: 'Het kantoorprofiel ("over ons") is nog niet ingevuld.' }
  }
  if (!opgericht || !kenmerken) {
    return {
      onderdeel: 'kantoorprofiel',
      status: 'zwak',
      uitleg: `Het kantoorprofiel is deels ingevuld — ${!opgericht ? 'het oprichtingsjaar' : 'de kenmerken'} ontbreken nog.`,
    }
  }
  return { onderdeel: 'kantoorprofiel', status: 'ok', uitleg: 'Het kantoorprofiel is compleet.' }
}

function werkgebiedGereedheid(werkgebied: KantoorInstellingen['werkgebied'] | null): VerkoopadviesGereedheidItem {
  const plaatsen = werkgebied?.plaatsen ?? []
  if (plaatsen.length === 0) {
    return { onderdeel: 'werkgebied', status: 'ontbreekt', uitleg: 'Er is nog geen werkgebied ingesteld.' }
  }
  return { onderdeel: 'werkgebied', status: 'ok', uitleg: `Werkgebied: ${plaatsen.length} plaats${plaatsen.length === 1 ? '' : 'en'}.` }
}

function marktcontextGereedheid(marktcontext: MarktanalyseSamenvatting | null): VerkoopadviesGereedheidItem {
  if (!marktcontext) {
    return { onderdeel: 'marktcontext', status: 'ontbreekt', uitleg: 'Er kon geen marktcontext worden opgehaald voor dit adres.' }
  }
  const n = marktcontext.huidig.n
  if (n < MIN_N_BETROUWBAAR) {
    return {
      onderdeel: 'marktcontext',
      status: 'zwak',
      uitleg: `De marktcontext steunt op maar ${n} vergelijkbare transactie${n === 1 ? '' : 's'} (minder dan ${MIN_N_BETROUWBAAR}) in deze plaats en dit woningtype.`,
    }
  }
  return { onderdeel: 'marktcontext', status: 'ok', uitleg: `De marktcontext steunt op ${n} vergelijkbare transacties.` }
}

function prijsverwachtingGereedheid(dossier: PropertyInput): VerkoopadviesGereedheidItem {
  if (dossier.prijsverwachting_verkoper == null) {
    return { onderdeel: 'prijsverwachting_verkoper', status: 'ontbreekt', uitleg: 'De verkoper heeft nog geen prijsverwachting opgegeven.' }
  }
  return {
    onderdeel: 'prijsverwachting_verkoper',
    status: 'ok',
    uitleg: `Prijsverwachting van de verkoper: ${euro(dossier.prijsverwachting_verkoper)}.`,
  }
}

function wozGereedheid(dossier: PropertyInput): VerkoopadviesGereedheidItem {
  if (dossier.woz_waarde == null) {
    return { onderdeel: 'woz', status: 'ontbreekt', uitleg: 'Er is nog geen WOZ-waarde ingevuld.' }
  }
  return {
    onderdeel: 'woz',
    status: 'ok',
    uitleg: `WOZ-waarde${dossier.woz_peiljaar ? ` (${dossier.woz_peiljaar})` : ''}: ${euro(dossier.woz_waarde)}.`,
  }
}

/**
 * Gereedheidscheck voor het verkoopadvies: per onderdeel `ok`/`ontbreekt`/
 * `zwak`, met een korte je-vorm-uitleg (geen "VestaAI"). Puur — leest alleen
 * uit het al opgebouwde contract, rekent niets opnieuw uit.
 */
export function verkoopadviesGereedheid(input: VerkoopadviesInput): VerkoopadviesGereedheidItem[] {
  return [
    waarderingGereedheid(input.waardering),
    courtageGereedheid(input.kantoor.courtage),
    kantoorprofielGereedheid(input.kantoor.profiel),
    werkgebiedGereedheid(input.kantoor.werkgebied),
    marktcontextGereedheid(input.marktcontext),
    prijsverwachtingGereedheid(input.dossier),
    wozGereedheid(input.dossier),
  ]
}
