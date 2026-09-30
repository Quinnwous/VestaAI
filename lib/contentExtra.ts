import { woningtypeLabel, type PropertyInput } from './schemas'

/**
 * Extra contentvormen (item 8.3, docs/architectuur.md § 4 "Outputset v2"): los
 * van de kern-call (funda/brochure/instagram/linkedin/sneak_preview/koper-
 * e-mail/buurt, altijd gegenereerd) genereert de makelaar deze alleen op
 * knopdruk via het "Meer…"-menu in `ResultTabs` → `POST
 * /api/object/[id]/extra?type=<sleutel>`. NL-only voor nu — een Engelse
 * variant is een latere uitbreiding (roadmap-noot bij 8.3), de EN-generatie
 * blokkeert er niet op.
 *
 * Pure promptbouw hier (testbaar zonder Claude-aanroep); de aanroep zelf zit
 * in `genereerExtraContent` (lib/claude.ts), conform de conventie "API-calls
 * naar Claude altijd via lib/claude.ts".
 */
export const EXTRA_TYPES = [
  'open_huis',
  'followup_positief',
  'followup_negatief',
  'video_script',
  'kopersvragen_faq',
  'energie_advies',
] as const

export type ExtraType = (typeof EXTRA_TYPES)[number]

export function isExtraType(waarde: string): waarde is ExtraType {
  return (EXTRA_TYPES as readonly string[]).includes(waarde)
}

/**
 * max_tokens per extra-type — elk een los, klein veld i.p.v. de hele suite
 * (die voorheen op max_tokens 16000 draaide voor alle 17 velden samen). Ruim
 * boven de verwachte woordenaantallen hieronder, zodat een net iets langer
 * antwoord niet halverwege wordt afgekapt.
 */
export const EXTRA_MAX_TOKENS: Record<ExtraType, number> = {
  open_huis: 500,
  followup_positief: 600,
  followup_negatief: 500,
  video_script: 500,
  kopersvragen_faq: 1600,
  energie_advies: 1300,
}

const EXTRA_LABEL: Record<ExtraType, string> = {
  open_huis: 'een open huis-aankondiging voor social media (±150 woorden) met datum en tijd als die bekend zijn',
  followup_positief: 'een opvolgmail na de bezichtiging voor een geïnteresseerde koper (±200 woorden, warm en uitnodigend, met een concrete vervolgstap)',
  followup_negatief: 'een opvolgmail na de bezichtiging voor een niet-geïnteresseerde koper (±150 woorden, bedankend en netwerkvriendelijk)',
  video_script: 'een voice-overscript voor een woningvideo van ±60 seconden (±120 woorden), verdeeld in korte scènes',
  kopersvragen_faq: '8–10 realistische, woningspecifieke kopersvragen met antwoord (adres, type, bouwjaar, prijs, energielabel, USP\'s). Format per item: "V: [vraag]\\nA: [antwoord]"',
  energie_advies: 'een energieadvies in "u"-vorm (±400 woorden) met de structuur: (1) huidige situatie — wat het energielabel betekent en hoe dat zich verhoudt tot een gemiddelde woning; (2) de top 3 verbetermaatregelen met geschatte kosten en terugverdientijd; (3) relevante subsidies (ISDE, SEEH, Nationaal Warmtefonds, gemeentesubsidies); (4) advies aan de makelaar over hoe het label in de verkoop te communiceren',
}

const SCHRIJFTOON_LABEL: Record<'formeel' | 'informeel' | 'enthousiast', string> = {
  formeel: 'Formeel en professioneel',
  informeel: 'Informeel en toegankelijk',
  enthousiast: 'Enthousiast en uitnodigend',
}

export function schrijftoonLabel(schrijftoon?: 'formeel' | 'informeel' | 'enthousiast'): string | undefined {
  return schrijftoon ? SCHRIJFTOON_LABEL[schrijftoon] : undefined
}

/**
 * Instructieregel voor bijgevoegde documenten (meetrapport, bouwkundige keuring,
 * taxatie) — inhoudelijk dezelfde redenering als het aparte systeemblok van de
 * kern-call (`generateContent` in lib/claude.ts), maar hier als losse tekstregel
 * omdat de extra-call geen system-parameter gebruikt. Vooral relevant voor
 * `energie_advies` (technische staat, isolatie) en `kopersvragen_faq`
 * (feitelijke vragen over bouwjaar/oppervlak/gebreken), maar generiek genoeg
 * om voor elk extra-type te gelden.
 */
export const DOCUMENTEN_INSTRUCTIE = 'Er zijn één of meer documenten bijgevoegd (bijvoorbeeld een meetrapport, bouwkundige keuring of taxatie). Gebruik de feitelijke gegevens hieruit — exacte oppervlaktes, bouwkundige staat, geconstateerde gebreken, installaties en bijzonderheden — waar relevant voor deze tekst. Neem uitsluitend over wat er echt in de documenten staat; verzin niets.'

/**
 * Bouwt de volledige gebruikersprompt voor één extra contentveld — platte
 * tekst als antwoord, geen JSON (zelfde, robuustere patroon als
 * `app/api/object/[id]/herschrijf/route.ts`: één veld, één duidelijke
 * instructie, geen JSON-parseerfout mogelijk).
 */
export function bouwExtraPrompt(type: ExtraType, input: PropertyInput, toon?: string, documentenAanwezig?: boolean): string {
  const openHuisRegel = input.open_huis_datum
    ? `\nOpen huis: ${input.open_huis_datum}${input.open_huis_tijd ? ` om ${input.open_huis_tijd}` : ''}`
    : ''
  const toonRegel = toon ? `\nSchrijftoon van het kantoor: ${toon}` : ''
  const documentenRegel = documentenAanwezig ? `\n\n${DOCUMENTEN_INSTRUCTIE}` : ''
  const prijs = input.vraagprijs ?? input.prijsverwachting_verkoper ?? 0

  return `Je bent een Nederlandse vastgoedcopywriter. Schrijf ${EXTRA_LABEL[type]} voor deze woning.

Woning: ${input.adres}
Type: ${woningtypeLabel(input)}, ${input.kamers} kamers
Oppervlak: ${input.oppervlak_m2} m²
Bouwjaar: ${input.bouwjaar}
Energielabel: ${input.energielabel}
Vraagprijs: €${prijs.toLocaleString('nl-NL')}
USP's: ${input.usps ?? ''}
Doelgroep: ${input.doelgroep ?? ''}${openHuisRegel}${toonRegel}${documentenRegel}

Geef ALLEEN de tekst terug, verder niets. Geen uitleg, geen labels, geen JSON, geen aanhalingstekens.`
}

/**
 * Extra's die al gegenereerd waren, blijven staan als de kern opnieuw wordt
 * gegenereerd (de kern-call levert ze niet meer, item 8.3) — anders wist
 * "Genereer content" stilletjes elke open-huis-tekst of FAQ.
 */
export function behoudExtras<T extends Record<string, unknown>>(oud: Record<string, unknown> | null | undefined, nieuw: T): T {
  if (!oud) return nieuw
  const behouden: Record<string, unknown> = {}
  for (const type of EXTRA_TYPES) {
    const oudeWaarde = oud[type]
    const nieuweWaarde = nieuw[type]
    const nieuwLeeg = nieuweWaarde === undefined || nieuweWaarde === null || nieuweWaarde === ''
    if (nieuwLeeg && typeof oudeWaarde === 'string' && oudeWaarde.trim() !== '') behouden[type] = oudeWaarde
  }
  return { ...nieuw, ...behouden }
}
