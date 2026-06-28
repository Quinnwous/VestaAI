import Anthropic from '@anthropic-ai/sdk'
import {
  PropertyInputSchema,
  ContentOutputSchema,
  type PropertyInput,
  type ContentOutput,
  type HuisstijlConfig,
} from './schemas'

export { PropertyInputSchema, ContentOutputSchema, type PropertyInput, type ContentOutput }

const BASE_SYSTEM_PROMPT = `Je bent een Nederlandse vastgoedcopywriter gespecialiseerd in Funda-advertenties.

Funda-regels:
- Max 800 woorden hoofdtekst
- Geen superlatieven zonder bewijs
- Geen discriminerende buurtomschrijvingen
- Unieke openingszin verplicht

Output: geldig JSON-object met precies deze sleutels:
{ "funda_tekst", "brochure_kort", "brochure_lang", "instagram_emotioneel",
  "instagram_informatief", "instagram_actie", "linkedin_kantoor",
  "linkedin_makelaar", "koper_email", "buurtomschrijving" }

Geen tekst buiten het JSON-object.`

function buildSystemPrompt(huisstijl?: HuisstijlConfig): string {
  if (!huisstijl) return BASE_SYSTEM_PROMPT

  const schrijftoonLabel = {
    formeel: 'Formeel en professioneel',
    informeel: 'Informeel en toegankelijk',
    enthousiast: 'Enthousiast en uitnodigend',
  }[huisstijl.schrijftoon]

  let extra = `\n\nHuisstijl van het makelaarskantoor:\n- Schrijftoon: ${schrijftoonLabel}`
  if (huisstijl.slogan) extra += `\n- Slogan: "${huisstijl.slogan}"`
  if (huisstijl.voorbeelden.length > 0) {
    extra += `\n\nVoorbeeldteksten (gebruik als stijlreferentie):\n`
    huisstijl.voorbeelden.forEach((v, i) => { extra += `\n--- Voorbeeld ${i + 1} ---\n${v}\n` })
  }

  return BASE_SYSTEM_PROMPT + extra
}

function buildUserMessage(input: PropertyInput): string {
  return `Woning: ${input.adres}
Type: ${input.woningtype}, ${input.kamers} kamers
Oppervlak: ${input.oppervlak_m2} m²
Bouwjaar: ${input.bouwjaar}
Energielabel: ${input.energielabel}
Vraagprijs: €${input.vraagprijs.toLocaleString('nl-NL')}
USP's: ${input.usps}
Doelgroep: ${input.doelgroep}

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
): Promise<ContentOutput> {
  // Ondersteunt zowel generateContent(input, huisstijl, client) als generateContent(input, client) (legacy tests)
  let huisstijl: HuisstijlConfig | undefined
  let client: Anthropic

  if (huisstijlOrClient instanceof Anthropic) {
    client = huisstijlOrClient
  } else {
    huisstijl = huisstijlOrClient
    client = clientArg ?? new Anthropic()
  }
  const systemPrompt = buildSystemPrompt(huisstijl)

  for (let attempt = 0; attempt < 2; attempt++) {
    const extra = attempt > 0
      ? '\n\nBelangrijk: geef ALLEEN het JSON-object terug, geen tekst ervoor of erna.'
      : ''

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: buildUserMessage(input) + extra }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    try {
      return parseClaudeResponse(text)
    } catch {
      if (attempt === 1) throw new Error('Claude gaf geen valide JSON na 2 pogingen')
    }
  }
  throw new Error('Onverwachte fout')
}
