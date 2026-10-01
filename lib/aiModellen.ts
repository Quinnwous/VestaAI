/**
 * Centrale modelconstanten voor élke Claude API-aanroep in de codebase (item
 * 8.1, docs/architectuur.md § 6, bindend): "Nergens anders een modelstring."
 * Een guard-test (`aiModellen.guard.test.ts`) faalt zodra een `claude-`-
 * modelstring buiten dit bestand opduikt in `lib/`, `app/` of `components/`.
 *
 * Model-id's afkomstig uit de `claude-api`-skill (stand 23 sep 2026) — géén
 * datum-achtervoegsels, dat zijn geen geldige, actuele model-id's.
 *
 * Modelwissel voor CONTENT gebeurt uitsluitend na de blinde evaluatieronde
 * (`docs/evaluatie/`, dit item) — zie docs/besluiten.md voor het besluit
 * zodra Quinn die vergelijking heeft beoordeeld.
 */

/**
 * Hoofdmodel voor de klantgerichte contentsuite: `generateContent` (Funda-
 * tekst, brochures, social, koper-e-mail, buurtomschrijving, extra's) en de
 * korte prijswijzigingsberichten. Blijft op het beproefde model tot de
 * blinde vergelijking tegen CONTENT_KANDIDAAT is gewonnen (architectuur § 6, item 8.1).
 */
export const CONTENT = 'claude-sonnet-4-6'

/**
 * Kandidaat voor CONTENT — nieuwste Sonnet uit de claude-api-skill. Uitsluitend
 * gebruikt door `scripts/evalueer-content.mjs` (evaluatieset, dit item) voor de
 * blinde A/B-vergelijking; nooit in het productiepad totdat die vergelijking
 * gewonnen is.
 */
export const CONTENT_KANDIDAAT = 'claude-sonnet-5'

/**
 * Tweede kandidaat voor CONTENT (besluit Quinn 1 okt 2026): Haiku in dezelfde
 * blinde ronde — sneller en goedkoper, dus ruimer binnen de functielimiet van
 * 300 s, mits de kwaliteit standhoudt. Net als CONTENT_KANDIDAAT alleen in
 * `scripts/evalueer-content.mjs`.
 */
export const CONTENT_KANDIDAAT_HAIKU = 'claude-haiku-4-5'

/**
 * Modellen die zonder `thinking`-parameter adaptief gaan denken (claude-api-
 * skill: Sonnet 5 "runs adaptive" bij weglaten; Sonnet 4.6 en Haiku 4.5 denken
 * dan niet). Ontdekt in de blinde ronde van 1 okt 2026: de denk-tokens aten de
 * 6.000 max_tokens van de kern-call op en blok 0 was een denkblok in plaats
 * van tekst. `denkenUit()` zet het expliciet uit, zodat zo'n model onder
 * dezelfde voorwaarden draait als het huidige CONTENT-model.
 */
const DENKT_STANDAARD = new Set<string>([CONTENT_KANDIDAAT])

export function denkenUit(model: string): { thinking?: { type: 'disabled' } } {
  return DENKT_STANDAARD.has(model) ? { thinking: { type: 'disabled' } } : {}
}

/**
 * De modellen die `scripts/evalueer-content.mjs` blind naast elkaar zet, met
 * de naam van hun constante (komt in het sleutelbestand, nooit in de map die
 * Quinn beoordeelt).
 */
export const EVALUATIE_MODELLEN = [
  { naam: 'CONTENT', model: CONTENT },
  { naam: 'CONTENT_KANDIDAAT', model: CONTENT_KANDIDAAT },
  { naam: 'CONTENT_KANDIDAAT_HAIKU', model: CONTENT_KANDIDAAT_HAIKU },
] as const

/**
 * Letterlijke tekstextractie uit een document (OCR-achtig, geen interpretatie):
 * `app/api/huisstijl/extract/route.ts` (PDF → platte tekst voor de huisstijl-
 * upload) en `scripts/seed-i4housing-content.mjs` (brochure-PDF → platte
 * tekst), plus de losse herschrijfaanroep per veld
 * (`app/api/object/[id]/herschrijf/route.ts`) — alledrie draaiden al op Haiku
 * (voorheen een gedateerde snapshot-id); dit centraliseert ze op de actuele
 * Haiku-id zonder gedragswijziging.
 *
 * NB USP-extractie (`extraheerUsps` in lib/claude.ts) hoort qua taak dicht bij
 * "extractie", maar is bewust NIET op dit model gezet: die vertaalt vrije,
 * ongestructureerde tekst naar geïnterpreteerde USP's (meer dan letterlijk
 * overtypen) en zonder een kwaliteitsvergelijking is niet "zeker" dat Haiku
 * dat evengoed doet. `extraheerUsps` blijft daarom op SAMENVATTING (huidige
 * model, ongewijzigd gedrag) — zie EXTRACTIE_KANDIDAAT hieronder.
 */
export const EXTRACTIE = 'claude-haiku-4-5'

/**
 * Kandidaat voor een toekomstige USP-extractor-migratie (zie de noot bij
 * EXTRACTIE hierboven) — nog niet ingezet. Zet pas om na een kwaliteitscheck
 * (bijv. via de evaluatieset-aanpak van dit item) en noteer dat besluit in
 * docs/besluiten.md.
 */
export const EXTRACTIE_KANDIDAAT = 'claude-haiku-4-5'

/**
 * Herschrijven van één enkel contentveld (`app/api/object/[id]/herschrijf/route.ts`):
 * lichter dan de volledige contentsuite (één veld, niet de hele set) en al
 * langer bewust op Haiku voor snelheid/kosten. Geen letterlijke extractie
 * (vandaar een eigen naam i.p.v. hergebruik van EXTRACTIE), maar wel dezelfde
 * Haiku-tier — zelfde model-id, aparte constante voor duidelijke naamgeving.
 */
export const HERSCHRIJF = 'claude-haiku-4-5'

/**
 * Samenvattings-/analysetaken die vrije tekst distilleren tot compacte,
 * herbruikbare output: `distilleerStijlprofiel` en `distilleerBewerkingsregels`
 * (lib/contentGeneratie.ts, stijlprofiel/geleerde regels uit voorbeeldteksten),
 * de documentenassistent-chat (`app/api/documenten/chat/route.ts`, vraag-
 * beantwoording over een bijgevoegd document) en `extraheerUsps` (lib/claude.ts,
 * zie de noot bij EXTRACTIE) — geen van alle klantgerichte eindcontent, wel
 * interpretatie/analyse die de kwaliteit van Sonnet vraagt.
 */
export const SAMENVATTING = 'claude-sonnet-4-6'

/**
 * Virtual staging (`app/api/fotos/staging/route.ts`) — enige niet-Claude-model
 * hier, maar dezelfde regel geldt: nergens anders een letterlijke modelstring.
 * gemini-3.1-flash-image ("Nano Banana 2", GA, $0,067 per 1K-afbeelding):
 * fotorealistisch meubels toevoegen met behoud van de architectuur. Vervangt
 * per 1 okt 2026 gemini-2.5-flash-image: Google sluit de 2.5-generatie voor
 * nieuwe gebruikers af (2.5-flash: 404 "no longer available to new users",
 * 2.5-flash-image: 403 "project has been denied access"). Werkt alleen met
 * billing aan — op de gratis laag is het quotum voor beeldmodellen 0.
 */
export const GEMINI_STAGING = 'gemini-3.1-flash-image'
