import { z } from 'zod'

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
})

export type KantoorInstellingen = z.infer<typeof KantoorInstellingenSchema>

// Fases van een woningdossier (besluit 16 sep 2026, zie CLAUDE.md § Hoofdstructuur):
// één dossier per adres, drie fases. Welke modules zichtbaar zijn hangt af van
// de fase — zie components/ObjectWorkspace.tsx.
export const ObjectFaseSchema = z.enum(['acquisitie', 'in_verkoop', 'verkocht'])
export type ObjectFase = z.infer<typeof ObjectFaseSchema>

export const PitchUitslagSchema = z.enum(['open', 'gewonnen', 'verloren'])
export type PitchUitslag = z.infer<typeof PitchUitslagSchema>

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

export const PropertyInputSchema = z.object({
  adres: z.string().min(5),
  woningtype: z.enum([
    'Appartement', 'Tussenwoning', 'Hoekwoning',
    'Vrijstaand', 'Villa', 'Penthouse',
  ]),
  kamers: z.number().int().min(1).max(20),
  oppervlak_m2: z.number().int().min(1).max(9999),
  bouwjaar: z.number().int().min(1800).max(2035),
  energielabel: z.enum(['A++++', 'A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G']),
  // Optioneel sinds de gedeelde intake (F3, besluit 16 sep 2026): in de
  // acquisitiefase is er nog geen vaste vraagprijs, alleen een
  // prijsverwachting van de verkoper (zie prijsverwachting_verkoper
  // hieronder). Content-generatie valt terug op die prijsverwachting.
  vraagprijs: z.number().int().min(1).optional(),
  usps: z.string().min(1).max(500),
  doelgroep: z.string().min(1),
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
  // Acquisitiefase (besluit 16 sep 2026): prijsverwachting van de verkoper en
  // het courtagevoorstel horen bij "opdracht winnen", niet bij "vraagprijs" —
  // dat laatste komt pas vast te staan zodra de fase naar In verkoop gaat.
  prijsverwachting_verkoper: z.number().int().min(1).optional(),
  courtagevoorstel_percentage: z.number().min(0).max(10).optional(),
  // Keuzevinkjes (F8, besluit 16 sep 2026: "ze vinken contentvorm aan die ze
  // willen genereren, zodat ze alleen krijgen wat ze willen"). Ontbreekt dit
  // veld (bestaande dossiers van vóór deze uitbreiding), dan blijft het oude
  // gedrag gelden: alle optionele content die Claude relevant acht.
  content_keuzes: z.array(z.enum(['followup', 'video', 'energieadvies', 'kopersvragen', 'marktanalyse'])).optional(),
})

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
