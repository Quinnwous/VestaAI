import Anthropic from '@anthropic-ai/sdk'
import {
  PropertyInputSchema,
  ContentOutputSchema,
  PrijswijzigingOutputSchema,
  woningtypeLabel,
  type PropertyInput,
  type ContentOutput,
  type HuisstijlConfig,
  type PrijswijzigingOutput,
} from './schemas'
import { CONTENT, SAMENVATTING } from './aiModellen'
import { controleerGuardrail, type Feitenblad } from './kwartaalbericht'
import { renderTekstsjabloonPrompt, valideerTekstsjabloon, bouwSjabloonCorrectie } from './tekstsjabloon'
import { bouwExtraPrompt, schrijftoonLabel, EXTRA_MAX_TOKENS, type ExtraType } from './contentExtra'

export { PropertyInputSchema, ContentOutputSchema, type PropertyInput, type ContentOutput }

// Kern-only sinds item 8.3 (Outputset v2, roadmap § 3.4): de kern-call
// genereert nog maar 7 velden (was 17) — de zes "extra" velden (open_huis,
// followup_positief/negatief, video_script, kopersvragen_faq, energie_advies)
// verhuisden naar losse, kleine calls op knopdruk (`genereerExtraContent`
// hieronder, prompts in lib/contentExtra.ts). Dat is de daadwerkelijke
// snelheidswinst: minder te schrijven tekst in dezelfde stream, dus minder
// wandkloktijd tegen de 300s Vercel-limiet (zie KERN_MAX_TOKENS hieronder
// voor de tokenschatting).
const BASE_SYSTEM_PROMPT_NL = `Je bent een Nederlandse vastgoedcopywriter gespecialiseerd in woningomschrijvingen voor Funda en social media.

FUNDA-TEKST (funda_tekst) — verplichte regels:
- LENGTE: minimaal 700 woorden. Dit is een harde ondergrens, geen streefwaarde — kom je onder de 700, breid dan uit met meer detail per ruimte, over de afwerking en over de buurt. Schrijf uitgebreid en rijk; een te korte tekst is een fout.
- Verdeel de tekst over minimaal 6 alinea's, elk met een eigen focus: (1) prikkelende opening, (2) indeling en ruimtes, (3) technische staat, (4) duurzaamheid/energie, (5) buurt en ligging, (6) afsluiting met call-to-action.
- Openingszin: uniek en prikkelend; begin NOOIT met het adres, de straatnaam, "Dit", "Deze", "De woning" of het woningtype
- Schrijf in derde persoon of wij-vorm — geen ik-vorm
- Geen prijsvermelding in de tekst (staat apart op Funda)
- Superlatieven alleen met onderbouwing uit de USP's ("luxe keuken" vereist bewijs in de invoer)
- Geen discriminerende buurt- of wijkomschrijvingen (WWGB)
- Geen overdreven leestekens (!!, ???) of ALL-CAPS
- Verplicht: minstens één alinea over technische staat (installaties, isolatie, renovaties, dakbedekking, cv-ketel)
- Verplicht: minstens één alinea over duurzaamheid — energielabel concreet uitgelegd (wat betekent het, vergelijking met gemiddelde woning), eventuele zonnepanelen, warmtepomp of extra isolatie uitgelicht
- Sluit af met een concrete call-to-action (bezichtiging of contact)

BROCHURETEKST (brochure_tekst): 350–450 woorden, geschikt voor zowel een gedrukte als een digitale brochure — kernpunten helder per alinea, geen prijsvermelding, geen ik-vorm.

INSTAGRAM (instagram): één post van 200–270 woorden inclusief emoji's en relevante hashtags — combineer het gevoel (lifestyle), de kernfeiten en een duidelijke call-to-action in één tekst (niet drie losse varianten).

LINKEDIN (linkedin_kantoor): 220–280 woorden, wij-vorm, professionele kantoorpresentatie voor de bedrijfspagina.

SNEAK PREVIEW (sneak_preview): kort WhatsApp-bericht van maximaal 600 tekens, ALTIJD in het Nederlands (ook als de rest van de output in het Engels is) — pakkende opening, 2–3 kernfeiten, eindigt met een uitnodiging om te reageren voor meer info of een bezichtiging.

KOPER-E-MAIL (koper_email): 220–280 woorden, professionele opvolgmail ná de bezichtiging — de verkopende makelaar schrijft aan iemand die de woning al heeft bezichtigd; warm en persoonlijk, geen uitnodiging voor een eerste bezichtiging (die heeft al plaatsgevonden), wél een concrete vervolgstap (vragen beantwoorden, tweede bezichtiging of biedprocedure toelichten).

BUURTOMSCHRIJVING (buurtomschrijving): minimaal 130 woorden (streef naar 130–170), feitelijk en positief, geen sociale of demografische kwalificaties, geen vergelijkingen met andere wijken.

Output: geldig JSON-object met precies deze sleutels:
{ "funda_tekst", "brochure_tekst", "instagram", "linkedin_kantoor",
  "sneak_preview", "koper_email", "buurtomschrijving" }

Geen tekst buiten het JSON-object.`

const BASE_SYSTEM_PROMPT_EN = `You are a real estate copywriter specialised in Dutch property listings.

Rules for the main description (funda_tekst):
- LENGTH: at least 700 words — a hard minimum, not a target. If you fall short, expand with more detail per room, on the finish, and on the neighbourhood. Spread it over at least 6 paragraphs: (1) compelling opening, (2) layout and rooms, (3) technical condition, (4) sustainability/energy, (5) neighbourhood and location, (6) closing with a call-to-action.
- Opening sentence must be unique and compelling; NEVER start with the address, street name, "This", "The property" or the property type
- No superlatives without evidence
- No discriminatory neighbourhood descriptions
- No price mention in the text
- Mandatory: at least one paragraph on technical condition (installations, insulation, renovations, boiler)
- Mandatory: at least one paragraph on sustainability — explain the energy label concretely (what it means, comparison with average home), highlight solar panels, heat pump, or extra insulation if present
- End with a concrete call-to-action (viewing or contact)

BROCHURE TEXT (brochure_tekst): 350–450 words, suitable for both a printed and a digital brochure — clear key points per paragraph, no price mention.

INSTAGRAM (instagram): one post of 200–270 words including emojis and relevant hashtags — combine the emotional angle, the key facts and a clear call-to-action in one post.

LINKEDIN (linkedin_kantoor): 220–280 words, "we"-voice, professional agency presentation for the company page.

BUYER EMAIL (koper_email): 220–280 words, professional follow-up email after the viewing — the selling agent writes to someone who already viewed the property; warm and personal, no invitation for a first viewing (that already took place), but a concrete next step.

NEIGHBOURHOOD (buurtomschrijving): at least 130 words, factual and positive, no social or demographic qualifications, no comparisons with other neighbourhoods.

Output: valid JSON object with exactly these keys:
{ "funda_tekst", "brochure_tekst", "instagram", "linkedin_kantoor",
  "koper_email", "buurtomschrijving" }

No text outside the JSON object.`

/** Eén systeemprompt-tekstblok, optioneel met een cache-breekpunt (prompt caching, item 8.1). */
type PromptBlok = { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }

/**
 * Bouwt het kantoor-specifieke huisstijlblok — stijlprofiel, voorbeeldteksten,
 * geleerde regels, brochurestijl. Bewust met VASTE Nederlandse labels,
 * ongeacht de generatietaal: dit blok bevat letterlijk dezelfde brontekst van
 * het kantoor voor een NL- én een EN-aanroep, en moet dus byte-voor-byte
 * identiek zijn om als gedeelde cache-prefix te dienen (zie
 * `buildSystemPromptBlokken` hieronder). Vóór deze herstructurering (item
 * 8.1) kregen de labels een Engelse vertaling bij `taal: 'en'` — dat brak de
 * gedeelde prefix, dus is bewust losgelaten; de inhoud (stijlprofiel,
 * voorbeelden, slogan) verandert niet.
 */
function buildHuisstijlBlok(huisstijl: HuisstijlConfig): string {
  const schrijftoonLabel = {
    formeel: 'Formeel en professioneel',
    informeel: 'Informeel en toegankelijk',
    enthousiast: 'Enthousiast en uitnodigend',
  }[huisstijl.schrijftoon]

  let blok = `Huisstijl van het makelaarskantoor:\n- Schrijftoon: ${schrijftoonLabel}`
  if (huisstijl.slogan) blok += `\n- Slogan: "${huisstijl.slogan}"`

  // Het gedestilleerde stijlprofiel is leidend. We sturen hooguit 3 integrale
  // voorbeelden mee als concrete referentie — meer zou de prompt (en de kosten) onnodig opblazen.
  if (huisstijl.stijlprofiel) {
    blok += `\n\nStijlprofiel van het kantoor (volg dit nauwgezet):\n${huisstijl.stijlprofiel}`
  }
  // Geleerde regels uit eerdere handmatige bewerkingen (na review geaccepteerd) — leidend.
  if (huisstijl.geleerde_regels) {
    blok += `\n\nGeleerde regels uit de eigen bewerkingen van het kantoor (pas deze toe):\n${huisstijl.geleerde_regels}`
  }
  const topVoorbeelden = huisstijl.voorbeelden.filter(Boolean).slice(0, 3)
  if (topVoorbeelden.length > 0) {
    blok += `\n\nVoorbeeldteksten (gebruik als stijlreferentie):\n`
    topVoorbeelden.forEach((v, i) => {
      blok += `\n--- Voorbeeld ${i + 1} ---\n${v}\n`
    })
  }

  // Brochure-specifieke stijl: alleen sturend voor brochure_kort en brochure_lang.
  const bro = huisstijl.brochure_stijl
  const broVoorbeelden = bro?.voorbeelden?.filter(Boolean).slice(0, 2) ?? []
  if (bro?.stijlprofiel || broVoorbeelden.length > 0) {
    blok += `\n\nBrochure-specifieke stijl (pas ALLEEN toe op brochure_kort en brochure_lang):`
    if (bro?.stijlprofiel) blok += `\n${bro.stijlprofiel}`
    broVoorbeelden.forEach((v, i) => {
      blok += `\n\n--- Brochure-voorbeeld ${i + 1} ---\n${v}`
    })
  }

  return blok
}

/**
 * Bouwt het systeemprompt op als (maximaal) twee cachebare tekstblokken, zodat
 * een NL- en een EN-generatie voor hetzelfde kantoor een gedeelde cache-
 * prefix kunnen delen (prompt caching, item 8.1, roadmap § 3.6):
 *
 * 1. **Gedeeld blok** (huisstijl, alleen als geconfigureerd) — voorop gezet
 *    en met een eigen `cache_control`-breekpunt, zodat `generateContentBeideTalen`
 *    (parallelle NL+EN-aanroep, zelfde kantoor) voor dít deel dezelfde
 *    cache-entry kan lezen/schrijven ondanks de verschillende taal erna.
 * 2. **Taalspecifiek blok** (`BASE_SYSTEM_PROMPT_NL`/`_EN`, ongewijzigd) —
 *    ná het eerste breekpunt, met een eigen tweede `cache_control`, zodat
 *    opeenvolgende generaties in dezelfde taal (andere dossiers, zelfde
 *    kantoor) in elk geval dát deel hergebruiken, ook al verschilt het
 *    tussen NL en EN.
 *
 * ⚠️ Gecontroleerd (item 8.1, eindrapport): het cachen is een prefix-match
 * met een model-afhankelijke ondergrens (voor `claude-sonnet-4-6`: 1024
 * tokens — `shared/prompt-caching.md` in de claude-api-skill). Een live
 * `count_tokens`-call (gratis endpoint, geen generatiekosten) op een
 * realistisch i4housing-achtig huisstijlblok (stijlprofiel + 3
 * voorbeeldteksten op het schemamaximum) mat **3373 tokens** — ruim boven de
 * ondergrens. Zelfs het taalspecifieke blok alléén (`BASE_SYSTEM_PROMPT_NL`,
 * zonder huisstijl) mat **1569 tokens** — óók boven de ondergrens, dus zelfs
 * zonder geconfigureerde huisstijl profiteren opeenvolgende generaties in
 * dezelfde taal van caching. Alleen bij een zeer kaal huisstijlblok (geen
 * stijlprofiel, hooguit één korte voorbeeldtekst) kan het gedeelde blok onder
 * de ondergrens duiken — geen fout, gewoon geen besparing voor dát blok
 * (`cache_creation_input_tokens: 0`).
 *
 * **Tekstsjabloon-blok (item 8.2, roadmap § 3.4):** is een kantoor
 * geconfigureerd met `huisstijl.tekstsjabloon`, dan komt er een derde
 * cachebare blok bij, ná het taalspecifieke basisblok — bewust laatste
 * (zwaarst wegende) instructie, omdat dit blok de generieke lengte-/
 * alinea-eisen van funda_tekst overschrijft. Dit blok is zelf taal-
 * afhankelijk (NL/EN-koppen verschillen) en dus niet byte-identiek tussen
 * een NL- en EN-aanroep — dat hoeft ook niet: het gedeelde huisstijlblok
 * (blok 1) blijft de enige prefix die NL/EN-generaties voor hetzelfde
 * kantoor delen, exact zoals vóór dit item. Blok 3 krijgt wél zijn eigen
 * cache-breekpunt, zodat opeenvolgende generaties in dezelfde taal voor
 * hetzelfde kantoor (ándere dossiers) er samen van profiteren.
 */
/**
 * Maximale duur van de kern-call waarna nog een sjabloon-herkansing mag
 * (item 8.2, drempel ongewijzigd in 8.3). Sinds 8.3 is de herkansing zelf
 * klein en gericht (alleen funda_tekst, zie herschrijfFundaTekstMetSjabloon
 * hieronder — een kwestie van seconden, niet 1-3 min zoals de oude "hele
 * suite opnieuw"-herkansing), dus deze drempel is nu vooral een vangrail
 * tegen een kern-call die zelf al ongewoon lang duurde, niet een strakke
 * begroting van twee volle generaties binnen 300 s.
 */
export const SJABLOON_HERKANSING_BUDGET_MS = 110_000

function buildSystemPromptBlokken(huisstijl: HuisstijlConfig | undefined, taal: 'nl' | 'en' = 'nl'): PromptBlok[] {
  const blokken: PromptBlok[] = []

  if (huisstijl) {
    const gedeeld = buildHuisstijlBlok(huisstijl)
    if (gedeeld) blokken.push({ type: 'text', text: gedeeld, cache_control: { type: 'ephemeral' } })
  }

  const taalspecifiek = taal === 'en' ? BASE_SYSTEM_PROMPT_EN : BASE_SYSTEM_PROMPT_NL
  blokken.push({ type: 'text', text: taalspecifiek, cache_control: { type: 'ephemeral' } })

  if (huisstijl?.tekstsjabloon) {
    const sjabloonBlok = renderTekstsjabloonPrompt(huisstijl.tekstsjabloon, taal)
    blokken.push({ type: 'text', text: sjabloonBlok, cache_control: { type: 'ephemeral' } })
  }

  return blokken
}

// Destilleert uit (max 20) voorbeeldteksten één compact, herbruikbaar stijlprofiel.
// Draait server-side bij het opslaan van de huisstijl, zodat generaties niet alle
// voorbeelden integraal hoeven mee te sturen. Best-effort: de aanroeper vangt fouten af.
export async function distilleerStijlprofiel(
  voorbeelden: string[],
  schrijftoon: HuisstijlConfig['schrijftoon'],
  slogan: string,
  client?: Anthropic,
): Promise<string> {
  const nietLeeg = voorbeelden.filter(Boolean)
  if (nietLeeg.length === 0) return ''

  const c = client ?? new Anthropic()
  const toon = {
    formeel: 'formeel en professioneel',
    informeel: 'informeel en toegankelijk',
    enthousiast: 'enthousiast en uitnodigend',
  }[schrijftoon]

  const voorbeeldBlok = nietLeeg.map((v, i) => `--- Voorbeeld ${i + 1} ---\n${v}`).join('\n\n')

  const message = await c.messages.create({
    model: SAMENVATTING,
    max_tokens: 1200,
    system:
      'Je bent een redactioneel analist. Je destilleert uit voorbeeldteksten van één makelaarskantoor een compact, herbruikbaar stijlprofiel waarmee een AI-copywriter in exact díe huisstijl kan schrijven.',
    messages: [
      {
        role: 'user',
        content: `Basis-schrijftoon: ${toon}${slogan ? `\nSlogan: "${slogan}"` : ''}

Hieronder ${nietLeeg.length} voorbeeldtekst(en) van dit kantoor. Destilleer één compact stijlprofiel (max ~350 woorden) met concrete, direct toepasbare kenmerken:
- Toon & register
- Zinslengte en ritme
- Woordkeus, vaste termen en te vermijden woorden
- Structuur en opbouw van een tekst
- Do's en don'ts (korte opsomming)

Schrijf het als directe instructie aan een copywriter, niet als analyse-essay. Geen inleiding of afsluiting — alléén het profiel.

${voorbeeldBlok}`,
      },
    ],
  })

  return message.content[0].type === 'text' ? message.content[0].text.trim() : ''
}

// Destilleert uit paren (origineel → bewerkt) de systematische stijlvoorkeuren van een
// kantoor tot enkele concrete, herbruikbare regels. Draait bij de handmatige "leren"-actie;
// het resultaat gaat pas na akkoord van de makelaar naar huisstijl_json.geleerde_regels.
export async function distilleerBewerkingsregels(
  bewerkingen: { sleutel: string; origineel: string; bewerkt: string }[],
  bestaandeRegels?: string,
  client?: Anthropic,
): Promise<string> {
  if (bewerkingen.length === 0) return ''
  const c = client ?? new Anthropic()

  const blok = bewerkingen
    .map((b, i) => `#${i + 1} (${b.sleutel})\n--- ORIGINEEL ---\n${b.origineel}\n--- BEWERKT DOOR MAKELAAR ---\n${b.bewerkt}`)
    .join('\n\n')

  const bestaand = bestaandeRegels
    ? `\n\nEr zijn al eerder geleerde regels. Vul aan/verfijn, spreek ze niet tegen:\n${bestaandeRegels}`
    : ''

  const message = await c.messages.create({
    model: SAMENVATTING,
    max_tokens: 800,
    system:
      'Je bent een redactioneel analist. Een makelaar bewerkt door AI gegenereerde teksten handmatig. Uit de verschillen tussen origineel en bewerkte versie leid je de SYSTEMATISCHE voorkeuren van dit kantoor af.',
    messages: [
      {
        role: 'user',
        content: `Hieronder ${bewerkingen.length} paren van (origineel → door de makelaar bewerkt). Leid de terugkerende, systematische voorkeuren af — negeer eenmalige, woningspecifieke wijzigingen (adres, prijs, feiten).

Geef maximaal 6 concrete, direct toepasbare stijlregels als korte bullets (met een streepje). Denk aan: voorkeurswoorden vs. vermeden woorden, aanspreekvorm, zinslengte, opening/afsluiting, opmaakvoorkeuren. Geen inleiding of analyse — alléén de bullets.${bestaand}

${blok}`,
      },
    ],
  })

  return message.content[0].type === 'text' ? message.content[0].text.trim() : ''
}

function buildUserMessage(input: PropertyInput, verrijkingTekst?: string): string {
  const isEn = input.taal === 'en'
  // Verkoopadvies-fase heeft nog geen vaste vraagprijs — val terug op de
  // prijsverwachting van de verkoper (zie lib/schemas.ts, F3).
  const prijs = input.vraagprijs ?? input.prijsverwachting_verkoper ?? 0
  const prijsFormatted = `€${prijs.toLocaleString('nl-NL')}`

  const openHuisRegel = input.open_huis_datum
    ? isEn
      ? `\nOpen house: ${input.open_huis_datum}${input.open_huis_tijd ? ` at ${input.open_huis_tijd}` : ''}`
      : `\nOpen huis: ${input.open_huis_datum}${input.open_huis_tijd ? ` om ${input.open_huis_tijd}` : ''}`
    : ''

  const verrijking = verrijkingTekst ? `\n${verrijkingTekst}` : ''

  if (isEn) {
    return `Property: ${input.adres}
Type: ${woningtypeLabel(input)}, ${input.kamers} rooms
Floor area: ${input.oppervlak_m2} m²
Year built: ${input.bouwjaar}
Energy label: ${input.energielabel}
Asking price: ${prijsFormatted}
USPs: ${input.usps}
Target audience: ${input.doelgroep}${openHuisRegel}${verrijking}

Generate all content in English as JSON.`
  }

  return `Woning: ${input.adres}
Type: ${woningtypeLabel(input)}, ${input.kamers} kamers
Oppervlak: ${input.oppervlak_m2} m²
Bouwjaar: ${input.bouwjaar}
Energielabel: ${input.energielabel}
Vraagprijs: ${prijsFormatted}
USP's: ${input.usps}
Doelgroep: ${input.doelgroep}${openHuisRegel}${verrijking}

Genereer alle content als JSON.`
}

function parseClaudeResponse(text: string): ContentOutput {
  const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
  return ContentOutputSchema.parse(JSON.parse(cleaned))
}

/**
 * max_tokens voor de kern-call (item 8.3): vóór dit item genereerde één call
 * alle 17 velden op max_tokens 16000. De kern is nu 7 velden; geschat
 * outputvolume (bij de langste toegestane lengtes): funda_tekst ~1000
 * tokens (700+ woorden), brochure_tekst ~650 tokens (450 woorden),
 * instagram ~400 tokens, linkedin_kantoor ~400 tokens, sneak_preview ~180
 * tokens (600 tekens), koper_email ~400 tokens, buurtomschrijving ~250
 * tokens — samen ~3300 tokens content + JSON-overhead. 6000 geeft daar nog
 * een ruime marge boven (~1,8×) zonder de oude, veel te royale 16000 te
 * behouden. Minder te schrijven tekst in dezelfde stream betekent minder
 * wandkloktijd tegen de 300s Vercel-limiet — dát is de daadwerkelijke
 * snelheidswinst, niet een modelwissel.
 */
const KERN_MAX_TOKENS = 6000

/**
 * max_tokens voor de gerichte sjabloon-herkansing hieronder — alléén
 * funda_tekst, niet de hele kern-set.
 */
const HERKANSING_MAX_TOKENS = 3000

/**
 * Gerichte sjabloon-herkansing (item 8.3, vervangt de "hele suite opnieuw"-
 * herkansing van item 8.2 — zie docs/besluiten.md 26-27 sep 2026: "Beter
 * (8.3): alleen funda_tekst opnieuw laten schrijven"). Kleine, snelle call
 * die alléén funda_tekst herschrijft volgens het sjabloon; het antwoord is
 * platte tekst, geen JSON — dus geen JSON-parseerfout meer mogelijk in de
 * herkansing zelf (een robuustheidswinst bovenop de snelheidswinst).
 *
 * Modelkeuze: CONTENT, niet HERSCHRIJF (Haiku). funda_tekst blijft het
 * creatieve hoofdwerk van de hele suite — een exacte koppenvolgorde plus een
 * letterlijke, verplichte slotzin volgen is een striktere eis dan de vrije
 * herschrijfinstructies van `/api/object/[id]/herschrijf` (waar Haiku wél
 * volstaat). Die kwaliteit willen we niet inruilen voor snelheid; de winst
 * zit in de omvang (1 veld i.p.v. alle zeven kernvelden, max_tokens 3000
 * i.p.v. 6000/16000), niet in een goedkoper model.
 */
async function herschrijfFundaTekstMetSjabloon(
  input: PropertyInput,
  huisstijl: HuisstijlConfig,
  origineleTekst: string,
  fouten: string[],
  client: Anthropic,
): Promise<string> {
  const taal = input.taal ?? 'nl'
  const sjabloon = huisstijl.tekstsjabloon!
  const systemBlokken: PromptBlok[] = []
  const huisstijlBlok = buildHuisstijlBlok(huisstijl)
  if (huisstijlBlok) systemBlokken.push({ type: 'text', text: huisstijlBlok })
  systemBlokken.push({ type: 'text', text: renderTekstsjabloonPrompt(sjabloon, taal) })

  const correctie = bouwSjabloonCorrectie(fouten, taal)
  const kenmerken = `${input.adres}, ${woningtypeLabel(input)}, ${input.kamers} ${taal === 'en' ? 'rooms' : 'kamers'}, ${input.oppervlak_m2} m², ${taal === 'en' ? 'built' : 'bouwjaar'} ${input.bouwjaar}, ${taal === 'en' ? 'energy label' : 'energielabel'} ${input.energielabel}.`

  const userText = taal === 'en'
    ? `Property: ${kenmerken}\n\nCurrent funda_tekst:\n${origineleTekst}${correctie}\n\nReturn ONLY the corrected funda_tekst as plain text — no JSON, no labels, no quotes.`
    : `Woning: ${kenmerken}\n\nHuidige funda_tekst:\n${origineleTekst}${correctie}\n\nGeef ALLEEN de gecorrigeerde funda_tekst terug als platte tekst — geen JSON, geen labels, geen aanhalingstekens.`

  const message = await client.messages.create({
    model: CONTENT,
    max_tokens: HERKANSING_MAX_TOKENS,
    system: systemBlokken,
    messages: [{ role: 'user', content: userText }],
  })
  return message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
}

export async function generateContent(
  input: PropertyInput,
  huisstijlOrClient?: HuisstijlConfig | Anthropic,
  clientArg?: Anthropic,
  verrijkingTekst?: string,
  documentFileIds?: string[],
  // Alleen voor de blinde evaluatieset (item 8.1, scripts/evalueer-content.mjs):
  // laat die het CONTENT_KANDIDAAT-model draaien zonder de prompt-opbouw te
  // dupliceren. Productiecode geeft dit nooit door — default blijft CONTENT.
  modelOverride?: string,
): Promise<ContentOutput> {
  let huisstijl: HuisstijlConfig | undefined
  let client: Anthropic

  const isHuisstijl = (x: unknown): x is HuisstijlConfig =>
    !!x && typeof x === 'object' && 'schrijftoon' in x

  if (!isHuisstijl(huisstijlOrClient) && huisstijlOrClient) {
    client = huisstijlOrClient as unknown as Anthropic
  } else {
    huisstijl = huisstijlOrClient as HuisstijlConfig | undefined
    // maxRetries laag: de kern-call kan bij drukte alsnog een halve minuut of
    // meer duren; een SDK-retry (bij 429/5xx) zou de wandkloktijd verdubbelen
    // en de Vercel-functie (maxDuration) alsnog laten aftikken. timeout ruim
    // binnen maxDuration=300s.
    client = clientArg ?? new Anthropic({ maxRetries: 1, timeout: 280_000 })
  }
  // Twee cachebare blokken (huisstijl gedeeld tussen NL/EN + taalspecifieke basisregels) —
  // zie buildSystemPromptBlokken hierboven voor de cache-redenering (item 8.1).
  const systemBlokken = buildSystemPromptBlokken(huisstijl, input.taal ?? 'nl')

  // Bijgevoegde documenten (meetrapport, bouwkundige keuring, taxatie): feitelijke gegevens
  // hieruit moeten de teksten aanscherpen — vooral de technische staat en de FAQ. Als eigen,
  // ongecachet blok ná de twee cachebare blokken: dit varieert per aanvraag en mag de
  // cache-prefix van de eerste twee blokken niet raken.
  const docIds = documentFileIds?.filter(Boolean) ?? []
  if (docIds.length > 0) {
    systemBlokken.push({
      type: 'text',
      text: input.taal === 'en'
        ? `ATTACHED DOCUMENTS: one or more documents are attached (e.g. a survey, structural inspection or valuation). Use the factual data from them — exact floor areas, structural condition, defects found, installations and particularities — in the texts, especially funda_tekst (technical condition) and brochure_tekst. Only use what is actually stated in the documents; never invent facts.`
        : `BIJGEVOEGDE DOCUMENTEN: er zijn één of meer documenten bijgevoegd (bijvoorbeeld een meetrapport, bouwkundige keuring of taxatie). Gebruik de feitelijke gegevens hieruit — exacte oppervlaktes, bouwkundige staat, geconstateerde gebreken, installaties en bijzonderheden — in de teksten, met name in funda_tekst (technische staat) en brochure_tekst. Neem uitsluitend over wat er echt in de documenten staat; verzin niets.`,
    })
  }

  const start = Date.now()
  let output: ContentOutput | null = null

  // Twee pogingen voor een parseerbaar JSON-antwoord (ongewijzigd patroon,
  // los van de sjabloon-herkansing hieronder — dat is nu een aparte, gerichte
  // stap ná een geslaagde parse, niet meer verweven met deze retry-lus).
  for (let attempt = 0; attempt < 2; attempt++) {
    const extra = attempt > 0
      ? (input.taal === 'en'
        ? '\n\nIMPORTANT: return ONLY the JSON object, no text before or after.'
        : '\n\nBelangrijk: geef ALLEEN het JSON-object terug, geen tekst ervoor of erna.')
      : ''

    const userText = buildUserMessage(input, verrijkingTekst) + extra

    // Streamen i.p.v. één lange non-streaming call: houdt de verbinding warm
    // (geen idle-timeout/504) en is de door Anthropic aanbevolen aanpak voor
    // hoge max_tokens — nog steeds relevant bij KERN_MAX_TOKENS.
    let text = ''
    const model = modelOverride ?? CONTENT
    if (docIds.length > 0) {
      // Documenten aanwezig → Files API-beta; hang de document-blokken vóór de tekst.
      const docBlocks = docIds.map(id => ({ type: 'document', source: { type: 'file', file_id: id } }))
      const stream = (client.beta.messages.stream as unknown as (p: Record<string, unknown>) => { finalMessage: () => Promise<Anthropic.Beta.Messages.BetaMessage> })({
        model,
        max_tokens: KERN_MAX_TOKENS,
        system: systemBlokken,
        messages: [{ role: 'user', content: [...docBlocks, { type: 'text', text: userText }] }],
        betas: ['files-api-2025-04-14'],
      })
      const raw = await stream.finalMessage()
      text = raw.content?.[0]?.type === 'text' ? raw.content[0].text : ''
    } else {
      const message = await client.messages.stream({
        model,
        max_tokens: KERN_MAX_TOKENS,
        system: systemBlokken,
        messages: [{ role: 'user', content: userText }],
      }).finalMessage()
      text = message.content[0].type === 'text' ? message.content[0].text : ''
    }

    try {
      output = parseClaudeResponse(text)
      break
    } catch {
      if (attempt === 1) throw new Error('Claude gaf geen valide JSON na 2 pogingen')
    }
  }
  if (!output) throw new Error('Onverwachte fout')

  // Tekstsjabloon-validatie + gerichte herkansing (item 8.2/8.3): alleen
  // relevant als het kantoor een sjabloon heeft geconfigureerd. Bij afwijking
  // en genoeg tijdsbudget over: één kleine, gerichte herkansing die alléén
  // funda_tekst herschrijft (zie herschrijfFundaTekstMetSjabloon hierboven) —
  // niet meer de hele kern-set opnieuw. Lukt de herkansing niet (fout of lege
  // tekst), dan blijft de oorspronkelijke funda_tekst staan met een
  // waarschuwing; content moet er komen, dit is geen harde fout.
  if (huisstijl?.tekstsjabloon) {
    const controle = valideerTekstsjabloon(output.funda_tekst, huisstijl.tekstsjabloon, input.taal ?? 'nl')
    if (!controle.ok) {
      if (Date.now() - start < SJABLOON_HERKANSING_BUDGET_MS) {
        try {
          const herschreven = await herschrijfFundaTekstMetSjabloon(input, huisstijl, output.funda_tekst, controle.fouten, client)
          if (herschreven) {
            output = { ...output, funda_tekst: herschreven }
            const herkeuring = valideerTekstsjabloon(herschreven, huisstijl.tekstsjabloon, input.taal ?? 'nl')
            if (!herkeuring.ok) {
              console.warn(`[tekstsjabloon] gerichte herkansing volgt het sjabloon nog niet volledig (${herkeuring.fouten.join('; ')}) — tekst wordt alsnog gebruikt.`)
            }
          } else {
            console.warn('[tekstsjabloon] gerichte herkansing gaf geen tekst terug — oorspronkelijke funda_tekst blijft staan.')
          }
        } catch (err) {
          console.warn(`[tekstsjabloon] gerichte herkansing mislukte (${err instanceof Error ? err.message : 'onbekende fout'}) — oorspronkelijke funda_tekst blijft staan.`)
        }
      } else {
        console.warn(`[tekstsjabloon] funda_tekst volgt het sjabloon niet (${controle.fouten.join('; ')}) — kern-call duurde al te lang voor een herkansing binnen 300s, content wordt alsnog geaccepteerd.`)
      }
    }
  }

  return output
}

/**
 * Genereert één "extra" contentveld op knopdruk (item 8.3, roadmap § 3.4
 * Outputset v2): `POST /api/object/[id]/extra?type=` roept dit aan. Los van
 * de kern-call — kleine, snelle, platte-tekst-call (geen JSON) per veld.
 * NL-only voor nu; EN is een latere uitbreiding (zie lib/contentExtra.ts).
 *
 * Modelkeuze: CONTENT, niet HERSCHRIJF (Haiku) — dit is nieuwe, klantgerichte
 * eindcontent (open huis-aankondiging, opvolgmail, energieadvies, kopers-
 * FAQ), niet een mechanische herschrijving van bestaande tekst zoals
 * `/api/object/[id]/herschrijf`. Dezelfde kwaliteitsbalk als de kern-call,
 * maar dan voor één veld — vandaar de veel kleinere `EXTRA_MAX_TOKENS` per
 * type in plaats van een goedkoper model.
 */
export async function genereerExtraContent(
  type: ExtraType,
  input: PropertyInput,
  huisstijl?: HuisstijlConfig,
  client?: Anthropic,
): Promise<string> {
  const c = client ?? new Anthropic()
  const prompt = bouwExtraPrompt(type, input, schrijftoonLabel(huisstijl?.schrijftoon))

  const message = await c.messages.create({
    model: CONTENT,
    max_tokens: EXTRA_MAX_TOKENS[type],
    messages: [{ role: 'user', content: prompt }],
  })
  return message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
}

/**
 * Genereert de contentsuite in NL én EN (besluit 16 sep 2026, zie CLAUDE.md §
 * Hoofdstructuur: "elke tekst standaard NL+EN"). Draait de bestaande,
 * onveranderde `generateContent`-pipeline twee keer parallel — één met
 * `taal: 'nl'`, één met `taal: 'en'` — zodat het beproefde prompt-ontwerp per
 * taal intact blijft. De Engelse generatie is best-effort: mislukt hij, dan
 * krijgt de makelaar nog steeds zijn Nederlandse content (`en: null`) in
 * plaats van dat de hele aanvraag faalt.
 */
export async function generateContentBeideTalen(
  input: PropertyInput,
  huisstijl?: HuisstijlConfig,
  verrijkingTekst?: string,
  documentFileIds?: string[],
  client?: Anthropic,
): Promise<{ nl: ContentOutput; en: ContentOutput | null }> {
  const [nl, en] = await Promise.all([
    generateContent({ ...input, taal: 'nl' }, huisstijl, client, verrijkingTekst, documentFileIds),
    generateContent({ ...input, taal: 'en' }, huisstijl, client, verrijkingTekst, documentFileIds).catch(() => null),
  ])
  return { nl, en }
}

// Prijswijziging: aparte Claude-call voor een bestaand object
export async function generatePrijswijzigingContent(params: {
  adres: string
  huidigeprijs: number
  nieuweprijs?: number
  type: 'prijsreductie' | 'verkocht'
  huisstijl?: HuisstijlConfig
}): Promise<PrijswijzigingOutput> {
  const client = new Anthropic()

  const isVerkocht = params.type === 'verkocht'
  const prijsInfo = isVerkocht
    ? `Verkoopprijs: €${params.nieuweprijs?.toLocaleString('nl-NL') ?? 'onbekend'}`
    : `Oude vraagprijs: €${params.huidigeprijs.toLocaleString('nl-NL')} → Nieuwe vraagprijs: €${params.nieuweprijs?.toLocaleString('nl-NL') ?? 'onbekend'}`

  const huisstijlExtra = params.huisstijl
    ? `\nHuisstijl: ${params.huisstijl.schrijftoon}${params.huisstijl.slogan ? `, slogan: "${params.huisstijl.slogan}"` : ''}`
    : ''

  const systemPrompt = `Je bent een Nederlandse vastgoedcopywriter. Genereer drie korte berichten als JSON:
{ "instagram_post", "linkedin_post", "email_geinteresseerden" }

- instagram_post: ±150 woorden, pakkend en visueel
- linkedin_post: ±200 woorden, professioneel en informatief
- email_geinteresseerden: ±250 woorden, persoonlijk en informatief

Geen tekst buiten het JSON-object.`

  const userMessage = `Woning: ${params.adres}
Situatie: ${isVerkocht ? 'VERKOCHT' : 'PRIJSREDUCTIE'}
${prijsInfo}${huisstijlExtra}

Genereer de drie berichten als JSON.`

  for (let attempt = 0; attempt < 2; attempt++) {
    const message = await client.messages.create({
      model: CONTENT,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()

    try {
      return PrijswijzigingOutputSchema.parse(JSON.parse(cleaned))
    } catch {
      if (attempt === 1) throw new Error('Claude gaf geen valide JSON voor prijswijziging')
    }
  }
  throw new Error('Onverwachte fout')
}

// AI USP-extractor (F7, zie CLAUDE.md § Hoofdstructuur): losse, kleine prompt
// naast de hoofdwaardering — vertaalt de vrije intaketekst naar
// gestructureerde USP's die zowel de waardering als de content voeden.
// Model: SAMENVATTING (huidige model, ongewijzigd) — zie de noot bij EXTRACTIE
// in lib/aiModellen.ts: dit is qua taak dicht bij extractie, maar interpreteert
// vrije tekst (meer dan letterlijk overtypen) en is daarom bewust niet zonder
// kwaliteitscheck naar Haiku (EXTRACTIE) verplaatst.
export async function extraheerUsps(vrijeTekst: string, client?: Anthropic): Promise<string[]> {
  const tekst = vrijeTekst.trim()
  if (!tekst) return []
  const c = client ?? new Anthropic()

  const message = await c.messages.create({
    model: SAMENVATTING,
    max_tokens: 500,
    system: 'Je vertaalt vrije tekst met bijzonderheden van een woning naar korte, losse Unique Selling Points (USP\'s). Geef ALLEEN een JSON-array van strings terug, geen uitleg. Elke USP is kort (max. 6 woorden), concreet en begint met een kenmerk, niet met een lidwoord. Voorbeeld invoer: "heeft een mooie garage en nieuw dakkapel uit 2023" → ["Ruime garage", "Nieuw dakkapel (2023)"]. Onbekende of vage input levert een lege array op — verzin niets.',
    messages: [{ role: 'user', content: tekst }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string').slice(0, 12) : []
  } catch {
    return []
  }
}

/**
 * Kwartaalbericht (item 6.4, docs/roadmap.md § 5 Fase 6): schrijft 250-350
 * woorden op basis van UITSLUITEND het feitenblad (`lib/kwartaalbericht.ts`
 * `bouwFeitenblad`) — nooit op basis van eigen kennis van de woningmarkt.
 * Guardrail: elk getal in de gegenereerde tekst moet in het feitenblad
 * voorkomen (`controleerGuardrail`); faalt dat, dan één herkansing met een
 * expliciete correctie-instructie, en anders een eerlijke foutmelding (geen
 * derde stille poging — de aanroeper toont de fout in de UI).
 */
export async function schrijfKwartaalbericht(
  feitenblad: Feitenblad,
  opts: { taal: 'nl' | 'en'; kantoorNaam?: string; huisstijl?: HuisstijlConfig },
  client?: Anthropic,
): Promise<{ tekst: string }> {
  const c = client ?? new Anthropic()
  const stijlBlok = opts.huisstijl ? buildHuisstijlBlok(opts.huisstijl) : ''
  const taalInstructie = opts.taal === 'en'
    ? 'Schrijf de lopende tekst in het Engels, maar behoud de Nederlandse getalnotatie EXACT zoals in het feitenblad (punt als duizendtal-scheiding, komma als decimaalteken — bv. "€ 1.235.000" en "3,2%"). Vertaal getallen niet naar Engelse notatie (geen "€1,235,000" of "3.2%").'
    : 'Schrijf de tekst in het Nederlands.'

  const systemPrompt = `Je bent de kantoortekstschrijver van een makelaarskantoor. Je schrijft een kort, feitelijk kwartaalbericht over de woningmarkt voor de eigen website of nieuwsbrief van het kantoor.

REGELS (hard, geen uitzondering):
- Gebruik UITSLUITEND de cijfers uit het FEITENBLAD hieronder. Verzin geen enkel getal, bedrag, percentage of aantal dat daar niet in staat — ook geen cijfers uit je eigen kennis van de woningmarkt.
- Elk getal dat je noemt moet letterlijk of in een voor de hand liggende afgeronde vorm uit het feitenblad komen (bv. "€ 1.235.000" mag als "ruim € 1,2 miljoen").
- Lengte: 250-350 woorden.
- ${taalInstructie}
- Toon: namens ${opts.kantoorNaam || 'het kantoor'}, informeel ("je/jouw"), noem nergens de naam "VestaAI".
- Structuur: pakkende opening over de markt in de regio, de kernstatistieken in lopende tekst (geen opsomming, geen bullets, geen kopjes), de vergelijking met de vorige periode, en het eigen aandeel van het kantoor. Sluit af met een korte, natuurlijke uitnodiging (bijvoorbeeld voor een waardebepaling) zonder concrete contactgegevens te verzinnen.
- Staat er in het feitenblad een waarschuwing over weinig data of een ontbrekende vergelijking? Benoem dat dan voorzichtig — geen schijnzekerheid.
- Platte lopende tekst in alinea's. Geen JSON, geen markdown-opmaak.

${stijlBlok}

${feitenblad.tekst}`

  let laatsteFout: { onbekend: string[] } | null = null
  for (let poging = 0; poging < 2; poging++) {
    const correctie = poging > 0
      ? `\n\nJe vorige poging bevatte een getal dat niet in het feitenblad staat (${laatsteFout?.onbekend.join(', ')}). Schrijf de tekst opnieuw en gebruik dit keer uitsluitend cijfers uit het feitenblad.`
      : ''

    const message = await c.messages.create({
      model: CONTENT,
      max_tokens: 1200,
      system: systemPrompt + correctie,
      messages: [{ role: 'user', content: 'Schrijf het kwartaalbericht.' }],
    })
    const tekst = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''

    const guardrail = controleerGuardrail(tekst, feitenblad)
    if (guardrail.ok) return { tekst }

    laatsteFout = { onbekend: guardrail.onbekend.map(g => g.ruw) }
    if (poging === 1) {
      throw new Error(`Het kwartaalbericht bevatte na 2 pogingen nog een getal dat niet in het feitenblad staat (${laatsteFout.onbekend.join(', ')}). Probeer het later opnieuw.`)
    }
  }
  throw new Error('Onverwachte fout bij het schrijven van het kwartaalbericht')
}

