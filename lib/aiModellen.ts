/**
 * Centrale modelconstanten voor élke Claude API-aanroep in de codebase (item
 * 8.1, docs/roadmap.md § 3.6, bindend): "Nergens anders een modelstring."
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
 * blinde vergelijking tegen CONTENT_KANDIDAAT is gewonnen (roadmap § 3.6/8.1).
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
