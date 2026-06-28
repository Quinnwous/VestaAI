import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

export const PropertyInputSchema = z.object({
  adres: z.string().min(5),
  woningtype: z.enum([
    'Appartement', 'Tussenwoning', 'Hoekwoning',
    'Vrijstaand', 'Villa', 'Penthouse',
  ]),
  kamers: z.number().int().min(1).max(20),
  oppervlak_m2: z.number().int().min(1).max(9999),
  bouwjaar: z.number().int().min(1800).max(2025),
  energielabel: z.enum(['A++++', 'A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G']),
  vraagprijs: z.number().int().min(1),
  usps: z.string().min(1).max(500),
  doelgroep: z.string().min(1),
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
})

export type ContentOutput = z.infer<typeof ContentOutputSchema>

const SYSTEM_PROMPT = `Je bent een Nederlandse vastgoedcopywriter gespecialiseerd in Funda-advertenties.

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
  client: Anthropic = new Anthropic(),
): Promise<ContentOutput> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const extra = attempt > 0
      ? '\n\nBelangrijk: geef ALLEEN het JSON-object terug, geen tekst ervoor of erna.'
      : ''

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
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
