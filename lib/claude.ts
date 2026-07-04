import Anthropic from '@anthropic-ai/sdk'
import {
  PropertyInputSchema,
  ContentOutputSchema,
  PrijswijzigingOutputSchema,
  type PropertyInput,
  type ContentOutput,
  type HuisstijlConfig,
  type PrijswijzigingOutput,
} from './schemas'

export { PropertyInputSchema, ContentOutputSchema, type PropertyInput, type ContentOutput }

const BASE_SYSTEM_PROMPT_NL = `Je bent een Nederlandse vastgoedcopywriter gespecialiseerd in woningomschrijvingen voor Funda en social media.

FUNDA-TEKST (funda_tekst) — verplichte regels:
- 700–800 woorden minimum, minimaal 5 alinea's
- Openingszin: uniek en prikkelend; begin NOOIT met het adres, de straatnaam, "Dit", "Deze", "De woning" of het woningtype
- Schrijf in derde persoon of wij-vorm — geen ik-vorm
- Geen prijsvermelding in de tekst (staat apart op Funda)
- Superlatieven alleen met onderbouwing uit de USP's ("luxe keuken" vereist bewijs in de invoer)
- Geen discriminerende buurt- of wijkomschrijvingen (WWGB)
- Geen overdreven leestekens (!!, ???) of ALL-CAPS
- Verplicht: minstens één alinea over technische staat (installaties, isolatie, renovaties, dakbedekking, cv-ketel)
- Verplicht: minstens één alinea over duurzaamheid — energielabel concreet uitgelegd (wat betekent het, vergelijking met gemiddelde woning), eventuele zonnepanelen, warmtepomp of extra isolatie uitgelicht
- Sluit af met een concrete call-to-action (bezichtiging of contact)

INSTAGRAM-VARIANTEN (elk 200–270 woorden, inclusief emoji's en hashtags):
- instagram_emotioneel: lifestyle-focus, aspirationeel gevoel, weinig feitjes — spreekt het hart aan
- instagram_informatief: kernfeiten compact en helder, praktisch en to-the-point
- instagram_actie: urgente CTA centraal, schaarste of momentum benadrukken, eindigt met duidelijke actie

LINKEDIN-VARIANTEN:
- linkedin_kantoor: 220–280 woorden, wij-vorm, professionele kantoorpresentatie voor bedrijfspagina
- linkedin_makelaar: 200–260 woorden, persoonlijk perspectief van de individuele makelaar, netwerk-aanspreken stijl

OVERIGE KERNFORMATS:
- brochure_kort: 200–240 woorden, printoptimaal, kernpunten helder per alinea
- brochure_lang: 480–560 woorden, volledig verkoopverhaal met alle features uitgebreid toegelicht
- koper_email: 220–280 woorden, professionele opvolgmail ná de bezichtiging — de verkopende makelaar schrijft aan iemand die de woning al heeft bezichtigd; warm en persoonlijk, geen uitnodiging voor een eerste bezichtiging (die heeft al plaatsgevonden), wél een concrete vervolgstap (vragen beantwoorden, tweede bezichtiging of biedprocedure toelichten)
- buurtomschrijving: 130–170 woorden, feitelijk en positief, geen sociale of demografische kwalificaties, geen vergelijkingen met andere wijken

EXTRA VELDEN:
- open_huis: aankondigingstekst voor social (±150 woorden) met datum en tijd als opgegeven; lege string als geen datum bekend.
- bezichtiging_followup_positief: opvolgmail na bezichtiging voor geïnteresseerde koper (±200 woorden, warm en uitnodigend).
- bezichtiging_followup_negatief: opvolgmail na bezichtiging voor niet-geïnteresseerde koper (±150 woorden, bedankend en netwerk-vriendelijk).
- video_script: voice-over script voor woningvideo ±60 seconden (±120 woorden), verdeeld in korte scènes.
- energie_advies: altijd invullen. Structuur: (1) Huidige situatie — wat betekent dit label, vergelijking met gemiddelde woning; (2) Verbetermaatregelen — top 3 maatregelen met geschatte kosten en terugverdientijd; (3) Subsidies — ISDE, SEEH, Nationaal Warmtefonds, gemeente-subsidies; (4) Advies voor makelaar — hoe het label te communiceren in de verkoop. In "u"-vorm, ±400 woorden.
- kopersvragen_faq: altijd invullen. 8–10 realistische kopervragen specifiek voor déze woning (adres, type, bouwjaar, prijs, energielabel, USP's). Format: "V: [vraag]\nA: [antwoord]".
- marktanalyse: altijd invullen. (1) Marktsegment en concurrentiepositie; (2) Doelgroepanalyse; (3) Verkoopstrategie; (4) Timing. ±300 woorden.

Output: geldig JSON-object met precies deze sleutels:
{ "funda_tekst", "brochure_kort", "brochure_lang", "instagram_emotioneel",
  "instagram_informatief", "instagram_actie", "linkedin_kantoor",
  "linkedin_makelaar", "koper_email", "buurtomschrijving",
  "open_huis", "bezichtiging_followup_positief", "bezichtiging_followup_negatief",
  "video_script", "energie_advies", "kopersvragen_faq", "marktanalyse" }

Geen tekst buiten het JSON-object.`

const BASE_SYSTEM_PROMPT_EN = `You are a real estate copywriter specialised in Dutch property listings.

Rules:
- Minimum 700 words for the main description, at least 5 paragraphs
- Opening sentence must be unique and compelling; NEVER start with the address, street name, "This", "The property" or the property type
- No superlatives without evidence
- No discriminatory neighbourhood descriptions
- No price mention in the text
- Mandatory: at least one paragraph on technical condition (installations, insulation, renovations, boiler)
- Mandatory: at least one paragraph on sustainability — explain the energy label concretely (what it means, comparison with average home), highlight solar panels, heat pump, or extra insulation if present
- End with a concrete call-to-action (viewing or contact)

Output: valid JSON object with exactly these keys:
{ "funda_tekst", "brochure_kort", "brochure_lang", "instagram_emotioneel",
  "instagram_informatief", "instagram_actie", "linkedin_kantoor",
  "linkedin_makelaar", "koper_email", "buurtomschrijving",
  "open_huis", "bezichtiging_followup_positief", "bezichtiging_followup_negatief",
  "video_script", "energie_advies", "kopersvragen_faq", "marktanalyse" }

Guidelines per extra field:
- open_huis: open house announcement for Instagram/social (±150 words) with date and time if provided; empty string if unknown.
- bezichtiging_followup_positief: follow-up email after viewing for an interested buyer (±200 words, warm and inviting).
- bezichtiging_followup_negatief: follow-up email after viewing for a non-interested buyer (±150 words, appreciative and network-friendly).
- video_script: voice-over script for a property video of ±60 seconds (±120 words), divided into short scenes.
- energie_advies: concrete energy advice based on the energy label. Always fill in. Structure: (1) Current situation — what this label means, comparison with average home; (2) Improvement measures — top 3 measures with estimated costs and payback period; (3) Subsidies — relevant Dutch subsidies applicable; (4) Advice for agent — how to communicate the energy label in the sale. ±400 words.
- kopersvragen_faq: realistic frequently asked questions from buyers about this specific property. Provide 8–10 questions with full answers. Format per item: "Q: [question]\nA: [answer]". Always fill in.
- marktanalyse: brief market analysis for this property. Structure: (1) Market segment; (2) Target audience analysis; (3) Sales strategy recommendations; (4) Timing. ±300 words. Always fill in.

No text outside the JSON object.`

function buildSystemPrompt(huisstijl?: HuisstijlConfig, taal: 'nl' | 'en' = 'nl'): string {
  const base = taal === 'en' ? BASE_SYSTEM_PROMPT_EN : BASE_SYSTEM_PROMPT_NL
  if (!huisstijl) return base

  const schrijftoonLabel = {
    formeel: taal === 'en' ? 'Formal and professional' : 'Formeel en professioneel',
    informeel: taal === 'en' ? 'Informal and accessible' : 'Informeel en toegankelijk',
    enthousiast: taal === 'en' ? 'Enthusiastic and inviting' : 'Enthousiast en uitnodigend',
  }[huisstijl.schrijftoon]

  const toonLabel = taal === 'en' ? 'Tone of voice' : 'Schrijftoon'
  const sloganLabel = taal === 'en' ? 'Slogan' : 'Slogan'
  const voorbeeldLabel = taal === 'en' ? 'Example texts (use as style reference)' : 'Voorbeeldteksten (gebruik als stijlreferentie)'
  const profielLabel = taal === 'en' ? 'Agency style profile (follow closely)' : 'Stijlprofiel van het kantoor (volg dit nauwgezet)'
  const kantoorLabel = taal === 'en' ? "Agency's house style" : 'Huisstijl van het makelaarskantoor'

  let extra = `\n\n${kantoorLabel}:\n- ${toonLabel}: ${schrijftoonLabel}`
  if (huisstijl.slogan) extra += `\n- ${sloganLabel}: "${huisstijl.slogan}"`

  // Het gedestilleerde stijlprofiel is leidend. In beide gevallen sturen we hooguit 3 integrale
  // voorbeelden mee als concrete referentie — meer zou de prompt (en de kosten) onnodig opblazen.
  if (huisstijl.stijlprofiel) {
    extra += `\n\n${profielLabel}:\n${huisstijl.stijlprofiel}`
  }
  const topVoorbeelden = huisstijl.voorbeelden.filter(Boolean).slice(0, 3)
  if (topVoorbeelden.length > 0) {
    extra += `\n\n${voorbeeldLabel}:\n`
    topVoorbeelden.forEach((v, i) => {
      extra += `\n--- ${taal === 'en' ? 'Example' : 'Voorbeeld'} ${i + 1} ---\n${v}\n`
    })
  }

  // Brochure-specifieke stijl: alleen sturend voor brochure_kort en brochure_lang.
  const bro = huisstijl.brochure_stijl
  const broVoorbeelden = bro?.voorbeelden?.filter(Boolean).slice(0, 2) ?? []
  if (bro?.stijlprofiel || broVoorbeelden.length > 0) {
    const broLabel = taal === 'en'
      ? 'Brochure-specific style (apply ONLY to brochure_kort and brochure_lang)'
      : 'Brochure-specifieke stijl (pas ALLEEN toe op brochure_kort en brochure_lang)'
    extra += `\n\n${broLabel}:`
    if (bro?.stijlprofiel) extra += `\n${bro.stijlprofiel}`
    broVoorbeelden.forEach((v, i) => {
      extra += `\n\n--- ${taal === 'en' ? 'Brochure example' : 'Brochure-voorbeeld'} ${i + 1} ---\n${v}`
    })
  }

  return base + extra
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
    model: 'claude-sonnet-4-6',
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

function buildUserMessage(input: PropertyInput, verrijkingTekst?: string): string {
  const isEn = input.taal === 'en'
  const prijsFormatted = `€${input.vraagprijs.toLocaleString('nl-NL')}`

  const openHuisRegel = input.open_huis_datum
    ? isEn
      ? `\nOpen house: ${input.open_huis_datum}${input.open_huis_tijd ? ` at ${input.open_huis_tijd}` : ''}`
      : `\nOpen huis: ${input.open_huis_datum}${input.open_huis_tijd ? ` om ${input.open_huis_tijd}` : ''}`
    : ''

  const verrijking = verrijkingTekst ? `\n${verrijkingTekst}` : ''

  if (isEn) {
    return `Property: ${input.adres}
Type: ${input.woningtype}, ${input.kamers} rooms
Floor area: ${input.oppervlak_m2} m²
Year built: ${input.bouwjaar}
Energy label: ${input.energielabel}
Asking price: ${prijsFormatted}
USPs: ${input.usps}
Target audience: ${input.doelgroep}${openHuisRegel}${verrijking}

Generate all content in English as JSON.`
  }

  return `Woning: ${input.adres}
Type: ${input.woningtype}, ${input.kamers} kamers
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

export async function generateContent(
  input: PropertyInput,
  huisstijlOrClient?: HuisstijlConfig | Anthropic,
  clientArg?: Anthropic,
  verrijkingTekst?: string,
  documentFileIds?: string[],
): Promise<ContentOutput> {
  let huisstijl: HuisstijlConfig | undefined
  let client: Anthropic

  const isHuisstijl = (x: unknown): x is HuisstijlConfig =>
    !!x && typeof x === 'object' && 'schrijftoon' in x

  if (!isHuisstijl(huisstijlOrClient) && huisstijlOrClient) {
    client = huisstijlOrClient as unknown as Anthropic
  } else {
    huisstijl = huisstijlOrClient as HuisstijlConfig | undefined
    client = clientArg ?? new Anthropic()
  }
  let systemPrompt = buildSystemPrompt(huisstijl, input.taal ?? 'nl')

  // Bijgevoegde documenten (meetrapport, bouwkundige keuring, taxatie): feitelijke gegevens
  // hieruit moeten de teksten aanscherpen — vooral de technische staat en de FAQ.
  const docIds = documentFileIds?.filter(Boolean) ?? []
  if (docIds.length > 0) {
    systemPrompt += input.taal === 'en'
      ? `\n\nATTACHED DOCUMENTS: one or more documents are attached (e.g. a survey, structural inspection or valuation). Use the factual data from them — exact floor areas, structural condition, defects found, installations and particularities — in the texts, especially funda_tekst (technical condition), brochure_lang, energie_advies and kopersvragen_faq. Only use what is actually stated in the documents; never invent facts.`
      : `\n\nBIJGEVOEGDE DOCUMENTEN: er zijn één of meer documenten bijgevoegd (bijvoorbeeld een meetrapport, bouwkundige keuring of taxatie). Gebruik de feitelijke gegevens hieruit — exacte oppervlaktes, bouwkundige staat, geconstateerde gebreken, installaties en bijzonderheden — in de teksten, met name in funda_tekst (technische staat), brochure_lang, energie_advies en kopersvragen_faq. Neem uitsluitend over wat er echt in de documenten staat; verzin niets.`
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const extra = attempt > 0
      ? (input.taal === 'en'
        ? '\n\nIMPORTANT: return ONLY the JSON object, no text before or after.'
        : '\n\nBelangrijk: geef ALLEEN het JSON-object terug, geen tekst ervoor of erna.')
      : ''

    const userText = buildUserMessage(input, verrijkingTekst) + extra

    let text = ''
    if (docIds.length > 0) {
      // Documenten aanwezig → Files API-beta; hang de document-blokken vóór de tekst.
      const docBlocks = docIds.map(id => ({ type: 'document', source: { type: 'file', file_id: id } }))
      const raw = await (client.beta.messages.create as unknown as (p: Record<string, unknown>) => Promise<Anthropic.Beta.Messages.BetaMessage>)({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        system: systemPrompt,
        messages: [{ role: 'user', content: [...docBlocks, { type: 'text', text: userText }] }],
        betas: ['files-api-2025-04-14'],
      })
      text = raw.content?.[0]?.type === 'text' ? raw.content[0].text : ''
    } else {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userText }],
      })
      text = message.content[0].type === 'text' ? message.content[0].text : ''
    }

    try {
      return parseClaudeResponse(text)
    } catch {
      if (attempt === 1) throw new Error('Claude gaf geen valide JSON na 2 pogingen')
    }
  }
  throw new Error('Onverwachte fout')
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
      model: 'claude-sonnet-4-6',
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

// SEO-tekst voor een wijk
export async function generateWijkSeoTekst(params: {
  wijk: string
  stad: string
}): Promise<string> {
  const client = new Anthropic()

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: `Je bent een Nederlandse SEO-copywriter gespecialiseerd in vastgoed. Schrijf een informatieve SEO-tekst over een wijk. Schrijf puur de tekst (geen JSON, geen markdown), ±400–600 woorden.`,
    messages: [{
      role: 'user',
      content: `Schrijf een SEO-tekst over de wijk ${params.wijk} in ${params.stad}. Focus op: sfeer, woningaanbod, voorzieningen, bereikbaarheid en kopers-doelgroep. Doel: hoog scoren op "[wijk] huizen te koop".`,
    }],
  })

  return message.content[0].type === 'text' ? message.content[0].text : ''
}
