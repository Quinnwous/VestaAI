import { z } from 'zod'
import { woningtypeGroep, woningtypeSub } from './transactieNormalisatie'
import { SLUG_REGEX, SLUG_MIN_LENGTE, SLUG_MAX_LENGTE } from './slug'

// Woningtype-taxonomie (docs/ontwerp/README.md § 5, waardering § 3.3): groep is
// hard vereist (de waarderingskern filtert kandidaten erop), subtype optioneel.
// Vooraan gedefinieerd omdat PropertyInputSchema (verderop) er al naar verwijst.
export const TypegroepSchema = z.enum(['appartement', 'rijwoning', 'halfvrijstaand', 'vrijstaand'])
export type Typegroep = z.infer<typeof TypegroepSchema>

const TYPEGROEP_LABELS: Record<Typegroep, string> = {
  appartement: 'Appartement',
  rijwoning: 'Rijwoning',
  halfvrijstaand: 'Halfvrijstaand',
  vrijstaand: 'Vrijstaand',
}

/**
 * Leesbaar woningtype-label voor overal waar je één string nodig hebt (Claude-
 * prompts, exports, InvoerToggle e.d.): het subtype als dat er is ("Villa"),
 * anders het groepslabel ("Vrijstaand"). Gebruik dit i.p.v. zelf
 * woningtype_groep/woningtype_sub samen te voegen — zo hoeft een aanroeper
 * maar één vorm te kennen.
 */
export function woningtypeLabel(input: { woningtype_groep: Typegroep; woningtype_sub?: string | null }): string {
  // Ook ruwe `objecten.input_json` van vóór 3.2 (plat `woningtype`) komt hier langs zonder parse.
  const genormaliseerd = migreerOudWoningtype(input) as { woningtype_groep?: Typegroep; woningtype_sub?: string | null }
  return genormaliseerd.woningtype_sub || (genormaliseerd.woningtype_groep ? TYPEGROEP_LABELS[genormaliseerd.woningtype_groep] : '')
}

/** Leesbaar label voor alleen de groep (optgroup-koppen e.d.), zie woningtypeLabel hierboven. */
export function typegroepLabel(groep: Typegroep): string {
  return TYPEGROEP_LABELS[groep]
}

export const HuisstijlSchema = z.object({
  schrijftoon: z.enum(['formeel', 'informeel', 'enthousiast']),
  slogan: z.string().max(100),
  primaire_kleur: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  // Tweede merkkleur. Samen met primaire_kleur kleurt deze de hele ingelogde
  // omgeving en het waarderingsrapport — zie lib/branding.ts.
  accent_kleur: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  // Lettertype + vormtaal van de ingelogde omgeving — samen met de kleuren en het logo
  // maakt dit de omgeving onherkenbaar als "VestaAI" voor een kantoor met eigen stijl.
  // Onbekend/leeg valt terug op VestaAI's eigen stijl (Jakarta Sans, zacht-rond) — zie lib/branding.ts.
  lettertype: z.enum(['jakarta', 'gantari', 'nunito']).optional(),
  vorm: z.enum(['zacht', 'strak']).optional(),
  // Favicon (tabblad-icoon) van het kantoor. Los van logo_url omdat een logo vaak een
  // brede wordmark is en een favicon een vierkant beeldmerk — geen aparte kolom nodig,
  // dit is JSON net als de rest van de huisstijl.
  favicon_url: z.string().min(1).optional(),
  // Sfeerbeeld van het kantoor (team, pand). `achtergrond_url` staat scherp als
  // volle-breedte banner bovenaan de kantoorpagina; `achtergrond_secundair_url` is een
  // reserveslot voor toekomstig gebruik elders. Leeg = geen banner.
  achtergrond_url: z.string().min(1).optional(),
  achtergrond_secundair_url: z.string().min(1).optional(),
  // Welkomstbanner op de startpagina. Apart van `achtergrond_url` omdat die
  // óók de kantoorpagina en het watermerk voedt: de banner is breed en laag,
  // dus daar werkt een andere (vaak liggende, of hoog uitgesneden) foto. Leeg
  // = de banner valt terug op `achtergrond_url`.
  banner_url: z.string().min(1).optional(),
  // Verticale uitsnede van de bannerfoto, 0 = bovenkant, 100 = onderkant.
  // Nodig omdat een staande foto in een brede, lage banner fors wordt
  // bijgesneden: zonder dit toont de browser het midden (bij een teamfoto de
  // tafel i.p.v. de gezichten).
  banner_focus_y: z.number().min(0).max(100).optional(),
  // Contactgegevens voor de merkbalk bovenaan de ingelogde omgeving.
  telefoon: z.string().max(40).optional(),
  email: z.string().max(120).optional(),
  voorbeelden: z.array(z.string().max(2000)).max(20),
  // Uit de voorbeelden gedestilleerd, compact stijlprofiel (server-side gegenereerd).
  // Wordt in de prompt gebruikt i.p.v. alle voorbeelden integraal → schaalt zonder promptkosten-explosie.
  stijlprofiel: z.string().max(4000).optional(),
  // Regels die VestaAI leerde uit de inline-bewerkingen van de makelaar (na review geaccepteerd).
  // Worden als extra sturing aan de prompt toegevoegd, naast het gedestilleerde stijlprofiel.
  geleerde_regels: z.string().max(4000).optional(),
  // Aparte brochure-huisstijl: eigen voorbeelden + gedestilleerd profiel (alleen voor
  // brochure_kort/brochure_lang) + vaste slottekst met kantoorgegevens voor de PDF-export.
  brochure_stijl: z.object({
    voorbeelden: z.array(z.string().max(2000)).max(10),
    stijlprofiel: z.string().max(4000).optional(),
    slot_tekst: z.string().max(600).optional(),
  }).optional(),
})

export type HuisstijlConfig = z.infer<typeof HuisstijlSchema>

// Slug voor de kantoorspecifieke inlogpagina (/login/[slug], item 9.1) — vorm
// gedeeld met lib/slug.ts (normaliseerSlug/isGeldigeSlug) en de
// databaseconstraint in supabase/migrations/20260923_kantoren_slug.sql.
export const KantoorSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(SLUG_MIN_LENGTE, `Minimaal ${SLUG_MIN_LENGTE} tekens`)
  .max(SLUG_MAX_LENGTE, `Maximaal ${SLUG_MAX_LENGTE} tekens`)
  .regex(SLUG_REGEX, 'Alleen kleine letters, cijfers en één koppelteken tussen woorden (bv. i4housing)')

// Zakelijke kantoorinstellingen — los van de visuele huisstijl hierboven.
// Beheerd door de platform-admin in /admin (besluit 16 sep 2026: één rol per
// kantoor, geen eigen instellingenscherm meer bij het kantoor zelf). Voedt
// straks het verkoopadvies (courtage, "over ons") en de standaardfilters van
// marktinzichten/kaart/referentieselectie (werkgebied).
export const KantoorInstellingenSchema = z.object({
  courtage: z.object({
    percentage: z.number().min(0).max(10).optional(),
    opstartkosten: z.number().min(0).optional(),
    dienstverlening: z.string().max(2000).optional(),
  }).optional(),
  profiel: z.object({
    opgericht: z.string().max(20).optional(),
    lidmaatschappen: z.string().max(200).optional(),
    kenmerken: z.string().max(2000).optional(),
  }).optional(),
  werkgebied: z.object({
    plaatsen: z.array(z.string().max(80)).max(30).default([]),
  }).optional(),
  // Demo-kantoor-vlag (item 2.3, docs/roadmap.md § Fase 2): seed-/opruimscripts
  // op de productiedatabase mogen uitsluitend een kantoor raken waarvan dit
  // `true` is — de enige vangrail die voorkomt dat een fixture-script ooit
  // i4housing of een ander echt kantoor treft. Zie scripts/seed-demo-kantoor.mjs
  // en lib/demoFixtureGuard.ts.
  demo: z.boolean().optional(),
})

export type KantoorInstellingen = z.infer<typeof KantoorInstellingenSchema>

// Fases van een woningdossier (besluit 16 sep 2026, zie CLAUDE.md § Hoofdstructuur):
// één dossier per adres, drie fases. Welke modules zichtbaar zijn hangt af van
// de fase — zie components/ObjectWorkspace.tsx. Waarde 'acquisitie' hernoemd
// naar 'verkoopadvies' in item 2.1 (besluit Quinn 17 sep 2026; het label was
// al eerder "Verkoopadvies", zie 1.9c) — migratie 20260917_transacties_pijplijn.sql
// werkt bestaande rijen bij.
export const ObjectFaseSchema = z.enum(['verkoopadvies', 'in_verkoop', 'verkocht'])
export type ObjectFase = z.infer<typeof ObjectFaseSchema>

// Staat & afwerking en Ligging & buitenruimte (besluit 16 sep 2026, F3 —
// gedeelde intake): precies de knoppen waaraan de waardering straks in de
// wat-als-scenario's laat draaien. Allemaal optioneel zodat bestaande dossiers
// (van vóór deze uitbreiding) geldig blijven.
export const StaatAfwerkingSchema = z.object({
  onderhoud_binnen: z.enum(['uitstekend', 'goed', 'voldoende', 'opknapper']).optional(),
  onderhoud_buiten: z.enum(['uitstekend', 'goed', 'voldoende', 'opknapper']).optional(),
  keuken_jaar: z.number().int().min(1900).max(2035).optional(),
  badkamer_jaar: z.number().int().min(1900).max(2035).optional(),
  isolatie: z.array(z.enum(['dak', 'muur', 'vloer', 'glas'])).optional(),
  zonnepanelen: z.boolean().optional(),
  recent_verbouwd: z.string().max(300).optional(),
})
export type StaatAfwerking = z.infer<typeof StaatAfwerkingSchema>

export const LiggingBuitenruimteSchema = z.object({
  ligging: z.enum(['hoekwoning', 'tussenwoning', 'vrijstaand', 'twee_onder_een_kap']).optional(),
  tuin_m2: z.number().int().min(0).max(99999).optional(),
  tuin_orientatie: z.enum(['noord', 'noordoost', 'oost', 'zuidoost', 'zuid', 'zuidwest', 'west', 'noordwest']).optional(),
  achterom: z.boolean().optional(),
  balkon_dakterras: z.boolean().optional(),
  garage_parkeren: z.enum(['garage', 'carport', 'oprit', 'openbaar', 'geen']).optional(),
  berging: z.boolean().optional(),
  uitzicht: z.string().max(200).optional(),
  bijzondere_ligging: z.array(z.enum(['water', 'park', 'drukke_weg'])).optional(),
  erfpacht: z.object({
    van_toepassing: z.boolean(),
    canon_per_jaar: z.number().min(0).optional(),
    afgekocht_tot: z.string().max(20).optional(),
  }).optional(),
  vve_bijdrage_per_maand: z.number().min(0).optional(),
  monument: z.boolean().optional(),
})
export type LiggingBuitenruimte = z.infer<typeof LiggingBuitenruimteSchema>

// Migreert de oude woningtype-enum (6 waarden, vóór item 3.2 — zie
// docs/roadmap.md § 3.2 en § 5 fase 3.2) naar de nieuwe groep+subtype-vorm.
// Bestaande dossiers in `objecten.input_json` hebben nog het platte veld
// `woningtype`; deze preprocess zet dat om via dezelfde taxonomie-mapping als
// de transactiedataset (lib/transactieNormalisatie.ts), zodat ze zonder
// migratie geldig blijven parsen. Nieuwe intakes leveren al woningtype_groep
// (+ optioneel woningtype_sub) rechtstreeks aan; heeft de invoer per ongeluk
// beide vormen (bv. een oud concept dat is aangevuld), dan wint de nieuwe.
export function migreerOudWoningtype(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) return data
  const obj = data as Record<string, unknown>
  if (!('woningtype' in obj)) return obj
  const { woningtype: oud, ...rest } = obj
  if (obj.woningtype_groep != null) return rest
  if (typeof oud !== 'string') return rest
  const groep = woningtypeGroep(oud)
  const sub = woningtypeSub(oud)
  return {
    ...rest,
    ...(groep ? { woningtype_groep: groep } : {}),
    ...(sub ? { woningtype_sub: sub } : {}),
  }
}

export const PropertyInputSchema = z.preprocess(migreerOudWoningtype, z.object({
  adres: z.string().min(5),
  // Groep+subtype i.p.v. de oude platte enum (item 3.2) — zelfde taxonomie
  // als de transactiedataset (docs/ontwerp/README.md § 5), zodat de
  // waardering vergelijkbare woningen kan vinden. Groep is hard vereist
  // (zie TypegroepSchema hierboven), subtype optioneel (niet elk kantoor
  // kiest een specifiek subtype, of de oude enum kon niet eenduidig gemapt
  // worden — zie migreerOudWoningtype hierboven).
  woningtype_groep: TypegroepSchema,
  woningtype_sub: z.string().min(1).optional(),
  kamers: z.number().int().min(1).max(20),
  oppervlak_m2: z.number().int().min(1).max(9999),
  bouwjaar: z.number().int().min(1800).max(2035),
  energielabel: z.enum(['A++++', 'A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G']),
  // Optioneel sinds de gedeelde intake (F3, besluit 16 sep 2026): in de
  // Verkoopadvies-fase is er nog geen vaste vraagprijs, alleen een
  // prijsverwachting van de verkoper (zie prijsverwachting_verkoper
  // hieronder). Content-generatie valt terug op die prijsverwachting.
  vraagprijs: z.number().int().min(1).optional(),
  // Optioneel sinds item 3.2: in de verkoopadviesfase is er nog geen verhaal
  // (dat komt pas als de woning in verkoop gaat, stap 5 "kan later" in
  // PropertyForm) — ook een lege string (ongewijzigd wizard-veld) moet
  // geldig blijven, geen `.min(1)` meer. `/api/generate` eist ze alsnog
  // voordat het de contentsuite draait.
  usps: z.string().max(500).optional(),
  doelgroep: z.string().optional(),
  // Optioneel: open huis
  open_huis_datum: z.string().max(50).optional(),
  open_huis_tijd: z.string().max(20).optional(),
  // Optioneel: taal (default NL — optioneel zodat bestaande records compatible blijven)
  taal: z.enum(['nl', 'en']).optional(),
  // Extra basiskenmerken uit de gedeelde intake (F3) — optioneel zodat bestaande
  // dossiers geldig blijven.
  perceel_m2: z.number().int().min(0).max(999999).optional(),
  inhoud_m3: z.number().int().min(0).max(99999).optional(),
  slaapkamers: z.number().int().min(0).max(20).optional(),
  badkamers: z.number().int().min(0).max(10).optional(),
  woonlagen: z.number().int().min(1).max(10).optional(),
  energielabel_geldig_tot: z.string().max(20).optional(),
  staat_afwerking: StaatAfwerkingSchema.optional(),
  ligging_buitenruimte: LiggingBuitenruimteSchema.optional(),
  // Verkoopadvies-fase (besluit 16 sep 2026): prijsverwachting van de verkoper
  // en het courtagevoorstel horen bij het verkoopadvies, niet bij
  // "vraagprijs" — dat laatste komt pas vast te staan zodra de fase naar In
  // verkoop gaat.
  prijsverwachting_verkoper: z.number().int().min(1).optional(),
  courtagevoorstel_percentage: z.number().min(0).max(10).optional(),
  // Keuzevinkjes (F8, besluit 16 sep 2026: "ze vinken contentvorm aan die ze
  // willen genereren, zodat ze alleen krijgen wat ze willen"). Ontbreekt dit
  // veld (bestaande dossiers van vóór deze uitbreiding), dan blijft het oude
  // gedrag gelden: alle optionele content die Claude relevant acht.
  content_keuzes: z.array(z.enum(['followup', 'video', 'energieadvies', 'kopersvragen', 'marktanalyse'])).optional(),
}))

export type PropertyInput = z.infer<typeof PropertyInputSchema>

export const ContentOutputSchema = z.object({
  funda_tekst: z.string(),
  brochure_kort: z.string(),
  brochure_lang: z.string(),
  instagram_emotioneel: z.string(),
  instagram_informatief: z.string(),
  instagram_actie: z.string(),
  linkedin_kantoor: z.string(),
  linkedin_makelaar: z.string(),
  koper_email: z.string(),
  buurtomschrijving: z.string(),
  // Optionele secties — standaard lege string als Claude ze weglaat
  open_huis: z.string().default(''),
  bezichtiging_followup_positief: z.string().default(''),
  bezichtiging_followup_negatief: z.string().default(''),
  video_script: z.string().default(''),
  energie_advies: z.string().default(''),
  kopersvragen_faq: z.string().default(''),
  marktanalyse: z.string().default(''),
})

export type ContentOutput = z.infer<typeof ContentOutputSchema>

// Content-generatiestatus van een dossier (item 3.1, docs/roadmap.md § 3.2):
// 'geen' meteen na het aanmaken zonder Claude, 'bezig' tijdens een lock (6
// min verlooptijd, zie lib/contentGeneratie.ts CONTENT_LOCK_VERLOOP_MS),
// 'klaar'/'fout' na afloop van de generatie.
export const ObjectContentStatusSchema = z.enum(['geen', 'bezig', 'klaar', 'fout'])
export type ObjectContentStatus = z.infer<typeof ObjectContentStatusSchema>

// Lege, geldige ContentOutput voor een net aangemaakt dossier zonder content
// (POST /api/object slaat deze op i.p.v. null) — `objecten.outputs_json`
// blijft NOT NULL, zie migratie 20260917_object_content_status.sql voor de
// afweging tegenover nullable maken.
export const LEEG_CONTENT_OUTPUT: ContentOutput = {
  funda_tekst: '',
  brochure_kort: '',
  brochure_lang: '',
  instagram_emotioneel: '',
  instagram_informatief: '',
  instagram_actie: '',
  linkedin_kantoor: '',
  linkedin_makelaar: '',
  koper_email: '',
  buurtomschrijving: '',
  open_huis: '',
  bezichtiging_followup_positief: '',
  bezichtiging_followup_negatief: '',
  video_script: '',
  energie_advies: '',
  kopersvragen_faq: '',
  marktanalyse: '',
}

// Schema voor prijswijziging-content (apart van de hoofd-output)
export const PrijswijzigingOutputSchema = z.object({
  instagram_post: z.string(),
  linkedin_post: z.string(),
  email_geinteresseerden: z.string(),
})

export type PrijswijzigingOutput = z.infer<typeof PrijswijzigingOutputSchema>

// Wachtwoord wijzigen op /account (masterplan fase 1.7, zie docs/roadmap.md).
export const WachtwoordWijzigenSchema = z.object({
  huidigWachtwoord: z.string().min(1, 'Vul je huidige wachtwoord in'),
  nieuwWachtwoord: z.string().min(10, 'Minimaal 10 tekens'),
})

export type WachtwoordWijzigen = z.infer<typeof WachtwoordWijzigenSchema>

// ---------------------------------------------------------------------------
// Waardering v2 — datacontract uit docs/roadmap.md § 3.3 (rekenkern gebouwd
// 17 sep 2026 door Fable in lib/waardering.ts; Sonnet sluit in fase 4 de
// RPC's, actions en het paneel aan). `waardering_json` op `objecten` bevat
// een WaarderingOpslag; v1-json ({ correctie }) wordt bij lezen gemigreerd
// via migreerWaarderingJson().
// ---------------------------------------------------------------------------

export const KwartaalSchema = z.string().regex(/^\d{4}-Q[1-4]$/)

export const CorrectieNaamSchema = z.enum(['garage', 'tuin', 'energielabel', 'bouwperiode', 'grootte'])
export type CorrectieNaam = z.infer<typeof CorrectieNaamSchema>
export const KenmerkNaamSchema = z.enum(['garage', 'tuin', 'energielabel', 'bouwperiode'])
export type KenmerkNaam = z.infer<typeof KenmerkNaamSchema>

export const WaarderingReferentieSchema = z.object({
  id: z.string(),
  adres: z.string(),
  afstand_m: z.number().nullable(),
  verkoopdatum: z.string(),
  prijs: z.number(),
  m2: z.number(),
  prijs_m2: z.number(),
  index_factor: z.number(),
  index_basis: z.enum(['eigen', 'cbs', 'geen']),
  /** per kenmerk de toegepaste correctiefactor (alleen ≠ 1) */
  correcties: z.partialRecord(CorrectieNaamSchema, z.number()),
  /** product van alle correcties */
  correctie_factor: z.number(),
  gewicht: z.number(),
  gelijkenis: z.number(),
  maanden: z.number(),
  waarde_geimpliceerd: z.number(),
  handmatig: z.boolean(),
})
export type WaarderingReferentie = z.infer<typeof WaarderingReferentieSchema>

/** Prijsniveau (mediaan € per m²) per klasse van een kenmerk op de regionale set. */
export const KenmerkEffectV2Schema = z.object({
  subjectKlasse: z.string().nullable(),
  niveaus: z.record(z.string(), z.object({ mediaanM2: z.number(), n: z.number() })),
  /** verschil in % van de klasse van het subject t.o.v. de referentieklasse ('zonder' resp. de middenklasse); null als niet bepaalbaar */
  verschilPct: z.number().nullable(),
  /** elke gebruikte klasse heeft n ≥ MIN_GROEP_CORRECTIE → automatisch toepasbaar */
  betrouwbaar: z.boolean(),
})
export type KenmerkEffectV2 = z.infer<typeof KenmerkEffectV2Schema>

export const GrootteEffectSchema = z.object({
  /** verandering van de € per m² per extra m² woonoppervlak, in % (meestal negatief) */
  perM2Pct: z.number(),
  n: z.number(),
  betrouwbaar: z.boolean(),
})
export type GrootteEffect = z.infer<typeof GrootteEffectSchema>

export const CorrectieStatusSchema = z.object({
  /** schakelaar (makelaar kan hem uitzetten) */
  aan: z.boolean(),
  /** op ten minste één referentie toegepast */
  toegepast: z.boolean(),
  toelichting: z.string(),
})

export const WaarderingUitkomstSchema = z.object({
  versie: z.literal(2),
  peildatum: z.string(),
  waarde: z.number().nullable(),
  laag: z.number().nullable(),
  hoog: z.number().nullable(),
  n: z.number(),
  weinigData: z.boolean(),
  straal_m: z.number().nullable(),
  maanden: z.number(),
  methode: z.enum(['straal', 'plaats']),
  index_basis: z.enum(['eigen', 'cbs', 'geen']),
  index_tm: KwartaalSchema.nullable(),
  referenties: z.array(WaarderingReferentieSchema),
  effecten: z.record(KenmerkNaamSchema, KenmerkEffectV2Schema.nullable()),
  grootte: GrootteEffectSchema.nullable(),
  correcties: z.record(CorrectieNaamSchema, CorrectieStatusSchema),
  woz: z.object({ waarde: z.number(), peildatum: z.string() }).nullable(),
  waarschuwingen: z.array(z.string()),
})
export type WaarderingUitkomst = z.infer<typeof WaarderingUitkomstSchema>

export const WaarderingCorrectieSchema = z.object({
  waarde: z.number(),
  motivatie: z.string(),
  datum: z.string(),
})

export const WaarderingOpslagSchema = z.object({
  versie: z.literal(2),
  uitkomst: WaarderingUitkomstSchema.nullable(),
  correctie: WaarderingCorrectieSchema.nullable(),
  handmatig: z.object({
    uitgesloten: z.array(z.string()),
    toegevoegd: z.array(z.string()),
  }),
})
export type WaarderingOpslag = z.infer<typeof WaarderingOpslagSchema>

// ---------------------------------------------------------------------------
// Verrijkingsdata (item 10.3, docs/roadmap.md § fase 10) — opslagvorm van een
// `fetchVerrijking()`-uitkomst (lib/verrijking.ts) op `objecten.verrijking_json`,
// met tijdstempel "opgehaald op". Migratie <ts>_object_verrijking.sql
// (additief, nog niet toegepast — zie besluiten.md). `versie: 1` naar analogie
// van WaarderingOpslagSchema hierboven, zodat een toekomstige vormwijziging
// dezelfde migratie-aanpak kan volgen.
// ---------------------------------------------------------------------------

const WozWaardeSchema = z.object({
  peildatum: z.string(),
  waarde: z.number(),
  belastingjaar: z.number(),
})

export const WozDataSchema = z.object({
  object_id: z.string().nullable(),
  waarden: z.array(WozWaardeSchema),
  stijging_pct: z.string().nullable(),
  per_m2: z.number().nullable(),
})

export const CbsNiveauSchema = z.enum(['buurt', 'wijk', 'gemeente', 'nederland'])
export type CbsNiveau = z.infer<typeof CbsNiveauSchema>

const CbsMetriekSchema = z.object({ waarde: z.number(), niveau: CbsNiveauSchema })

export const CbsDataSchema = z.object({
  gemeente: z.string(),
  buurtnaam: z.string().nullable(),
  wijknaam: z.string().nullable(),
  bron: z.string(),
  fijnste_niveau: CbsNiveauSchema,
  inkomen: CbsMetriekSchema.nullable(),
  pct_koop: CbsMetriekSchema.nullable(),
  woz_gem: CbsMetriekSchema.nullable(),
  pct_hoog_opgeleid: CbsMetriekSchema.nullable(),
  dichtheid_per_km2: CbsMetriekSchema.nullable(),
  pct_eengezins: CbsMetriekSchema.nullable(),
  huishoudensgrootte: CbsMetriekSchema.nullable(),
  pct_65plus: CbsMetriekSchema.nullable(),
  pct_met_kinderen: CbsMetriekSchema.nullable(),
  dichtheid: z.string(),
  buurtprofiel: z.enum(['Premium', 'Bovengemiddeld', 'Gemiddeld', 'Ondergemiddeld']),
  nl: z.object({
    inkomen: z.number().nullable(),
    pct_koop: z.number().nullable(),
    woz_gem: z.number().nullable(),
    pct_hoog_opgeleid: z.number().nullable(),
  }),
  gemeente_niveau: z.object({
    woz_gem: z.number().nullable(),
    dichtheid_per_km2: z.number().nullable(),
  }),  // Optioneel: rijen van vóór 24 sep 2026 hebben dit nog niet.
  nabijheid: z.object({
    supermarkt_km: CbsMetriekSchema.nullable(),
    huisarts_km: CbsMetriekSchema.nullable(),
    school_km: CbsMetriekSchema.nullable(),
    kinderdagverblijf_km: CbsMetriekSchema.nullable(),
  }).optional(),
})

const VoorzieningItemSchema = z.object({
  naam: z.string(),
  afstand_m: z.number(),
  looptijd_min: z.number(),
})

export const VoorzieningenDataSchema = z.object({
  supermarkt: z.array(VoorzieningItemSchema),
  apotheek: z.array(VoorzieningItemSchema),
  huisarts: z.array(VoorzieningItemSchema),
  scholen: z.array(VoorzieningItemSchema),
  ov_haltes: z.array(VoorzieningItemSchema),
  treinstation: z.array(VoorzieningItemSchema),
  groen: z.array(VoorzieningItemSchema),
  nabijheid_beoordeling: z.string(),
})

// Item 10.3-fix (23 sep 2026, review hoofdsessie): het vuistregel-marktblok
// (`MarktData`/`marktProfielOpzoeken()` in lib/verrijking.ts — vaste cijfers
// per gemeentetype, geen echte meting) sprak de eigen marktanalyse op basis
// van i4housing's transactiedataset tegen (bv. "-1,0% t.o.v. vraagprijs" in
// marktanalyse vs. een hardgecodeerde "5-15% boven vraagprijs" hier). Het
// blok is uit het dossier gehaald; deze schema's dragen in plaats daarvan een
// eigen-data-samenvatting (`marktanalyseSamenvatting()` in
// lib/transactiesQuery.ts, RPC `marktanalyse_samenvatting`) voor de plaats
// van het adres. `lib/verrijking.ts` MarktData/`markt` blijft ongewijzigd
// bestaan — die voedt uitsluitend de Claude-contentprompt
// (`verrijkingNaarPrompt()`), niet dit dossierscherm.
export const MarktEigenDataSchema = z.object({
  plaats: z.string(),
  periodeVan: z.string().nullable(),
  periodeTot: z.string().nullable(),
  n: z.number(),
  mediaanPrijs: z.number().nullable(),
  mediaanM2: z.number().nullable(),
  mediaanLooptijd: z.number().nullable(),
  pctTovVraag: z.number().nullable(),
})
export type MarktEigenData = z.infer<typeof MarktEigenDataSchema>

// Per bron (WOZ/CBS/voorzieningen) of het antwoord 'ok' (data), 'leeg' (bron
// antwoordde, dit adres levert niets op), 'mislukt' (netwerkfout/timeout) of
// 'niet_gekoppeld' (de bron is bewust niet aangesloten — WOZ, 24 sep 2026)
// was — zelfde union als lib/verrijking.ts `FetchStatus` (bewust hier
// opnieuw gedefinieerd i.p.v. geïmporteerd: lib/schemas.ts is client-safe en
// mag geen afhankelijkheid krijgen van lib/verrijking.ts se fetch-logica).
// `.optional()` op het veld zelf omdat rijen van vóór deze fix dit niet
// hebben; ontbreekt het, dan valt de UI terug op het oude gedrag (afleiden
// uit de aan-/afwezigheid van data).
export const FetchStatusSchema = z.enum(['ok', 'leeg', 'mislukt', 'niet_gekoppeld'])
export type FetchStatus = z.infer<typeof FetchStatusSchema>

export const VerrijkingOpslagSchema = z.object({
  versie: z.literal(1),
  woz: WozDataSchema.nullable(),
  cbs: CbsDataSchema.nullable(),
  voorzieningen: VoorzieningenDataSchema.nullable(),
  marktEigen: MarktEigenDataSchema.nullable().optional(),
  gemeente: z.string().nullable(),
  coord: z.object({ lat: z.number(), lon: z.number() }).nullable(),
  bronnen: z.object({
    woz: FetchStatusSchema,
    cbs: FetchStatusSchema,
    voorzieningen: FetchStatusSchema,
  }).optional(),
  /** ISO-tijdstempel van het moment waarop deze verrijking is opgehaald. */
  opgehaald_op: z.string(),
})
export type VerrijkingOpslag = z.infer<typeof VerrijkingOpslagSchema>

// ---------------------------------------------------------------------------
// Transactiefilter (item 2.2, docs/roadmap.md § 3.1 + docs/ontwerp/README.md
// § 4 "Filtermodel") — voedt `p_filters jsonb` van elke RPC in
// `lib/transactiesQuery.ts`. Alle velden optioneel: een lege filterset
// betekent "hele dataset" (min uitgesloten_reden). `wijken` gebruikt de
// samengestelde vorm "plaats|wijk" zoals het filtermodel voorschrijft.
//
// ⚠️ `makelaars` staat in het filtermodel ("Verkocht door") maar de
// transactietabel heeft geen makelaar-kolom — de RPC's/`transacties_gefilterd`
// negeren dit veld tot die koppeling bestaat (zie docs/roadmap.md § 3.1 en de
// opleverrapportage van item 2.2 voor de open actie).
// ---------------------------------------------------------------------------

export const TovVraagprijsSchema = z.enum(['alle', 'boven', 'op_of_onder'])
export type TovVraagprijs = z.infer<typeof TovVraagprijsSchema>

export const TransactieFilterSchema = z.object({
  plaatsen: z.array(z.string()).optional(),
  wijken: z.array(z.string()).optional(),
  typen: z.array(z.string()).optional(),
  datum_van: z.string().optional(),
  datum_tot: z.string().optional(),
  prijs_min: z.number().optional(),
  prijs_max: z.number().optional(),
  opp_min: z.number().optional(),
  opp_max: z.number().optional(),
  perceel_min: z.number().optional(),
  perceel_max: z.number().optional(),
  bouwjaar_min: z.number().optional(),
  bouwjaar_max: z.number().optional(),
  energielabels: z.array(z.string()).optional(),
  kamers_min: z.number().optional(),
  tuin: z.boolean().optional(),
  garage: z.boolean().optional(),
  tov_vraagprijs: TovVraagprijsSchema.optional(),
  looptijd_max: z.number().optional(),
  /** ⚠️ nog niet toegepast in de RPC's — geen makelaar-kolom op transacties, zie hierboven. */
  makelaars: z.array(z.string()).optional(),
  kantoren: z.array(z.string()).optional(),
  alleen_eigen: z.boolean().optional(),
  /**
   * Vrij zoekveld op adres (item 6.2, "Transacties opzoeken v2") —
   * case-insensitive substring-match. ⚠️ vereist de additieve migratie
   * `supabase/migrations/20260923180000_transacties_zoeken_v2.sql` (nog niet
   * toegepast); tot dan negeert `transacties_gefilterd()` dit veld stilzwijgend.
   */
  zoek: z.string().optional(),
})
export type TransactieFilter = z.infer<typeof TransactieFilterSchema>
