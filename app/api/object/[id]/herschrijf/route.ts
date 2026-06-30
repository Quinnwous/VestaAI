import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import type { PropertyInput } from '@/lib/schemas'

export const maxDuration = 60

const SLEUTEL_CONTEXT: Record<string, { nl: string; en: string; maxTokens: number }> = {
  funda_tekst: { nl: 'Funda-advertentietekst (600–800 woorden)', en: 'Funda listing description (600–800 words)', maxTokens: 2000 },
  brochure_kort: { nl: 'korte brochure (~200 woorden)', en: 'short brochure (~200 words)', maxTokens: 600 },
  brochure_lang: { nl: 'lange brochure (500+ woorden)', en: 'long brochure (500+ words)', maxTokens: 1500 },
  instagram_emotioneel: { nl: 'emotionele Instagram-post (max 2.200 tekens)', en: 'emotional Instagram post (max 2,200 chars)', maxTokens: 600 },
  instagram_informatief: { nl: 'informatieve Instagram-post (max 2.200 tekens)', en: 'informative Instagram post (max 2,200 chars)', maxTokens: 600 },
  instagram_actie: { nl: 'Instagram-post met call-to-action (max 2.200 tekens)', en: 'Instagram post with call to action (max 2,200 chars)', maxTokens: 600 },
  linkedin_kantoor: { nl: 'LinkedIn-post voor het kantoor (max 3.000 tekens)', en: 'LinkedIn post for the agency (max 3,000 chars)', maxTokens: 800 },
  linkedin_makelaar: { nl: 'LinkedIn-post voor de makelaar persoonlijk (max 3.000 tekens)', en: 'LinkedIn post for the individual agent (max 3,000 chars)', maxTokens: 800 },
  koper_email: { nl: 'e-mail aan potentiële kopers', en: 'email to potential buyers', maxTokens: 800 },
  buurtomschrijving: { nl: 'buurtomschrijving', en: 'neighbourhood description', maxTokens: 600 },
  open_huis: { nl: 'open huis-aankondiging voor social media (~150 woorden)', en: 'open house announcement for social media (~150 words)', maxTokens: 500 },
  bezichtiging_followup_positief: { nl: 'opvolgmail voor geïnteresseerde koper (~200 woorden)', en: 'follow-up email for interested buyer (~200 words)', maxTokens: 600 },
  bezichtiging_followup_negatief: { nl: 'opvolgmail voor niet-geïnteresseerde koper (~150 woorden)', en: 'follow-up email for non-interested buyer (~150 words)', maxTokens: 500 },
  video_script: { nl: 'voice-over script voor woningvideo (~60 seconden)', en: 'voice-over script for property video (~60 seconds)', maxTokens: 500 },
  energie_advies: { nl: 'energieadvies met subsidies (~400 woorden)', en: 'energy advice with subsidies (~400 words)', maxTokens: 1200 },
  kopersvragen_faq: { nl: 'kopersvragen FAQ (8–10 vragen)', en: 'buyer FAQ (8–10 questions)', maxTokens: 1500 },
  marktanalyse: { nl: 'marktanalyse en verkoopstrategie (~300 woorden)', en: 'market analysis and sales strategy (~300 words)', maxTokens: 900 },
}

function buildHerschrijfPrompt(
  sleutel: string,
  input: PropertyInput,
  huidigeTekst: string,
  instructie: string,
  taal: 'nl' | 'en',
): string {
  const ctx = SLEUTEL_CONTEXT[sleutel]
  const typeLabel = ctx ? (taal === 'en' ? ctx.en : ctx.nl) : sleutel

  if (taal === 'en') {
    return `You are a real estate copywriter. Rewrite the ${typeLabel} for this property.

Property details:
- Address: ${input.adres}
- Type: ${input.woningtype}, ${input.kamers} rooms, ${input.oppervlak_m2} m²
- Year built: ${input.bouwjaar} | Energy label: ${input.energielabel}
- Asking price: €${input.vraagprijs.toLocaleString('nl-NL')}
- USPs: ${input.usps}
- Target audience: ${input.doelgroep}

Current text:
${huidigeTekst}

${instructie ? `Rewrite instruction: ${instructie}` : 'Write a completely new, fresh version — different opening sentence, different structure, same facts.'}

Return ONLY the new text, nothing else. No explanation, no labels, no quotes.`
  }

  return `Je bent een Nederlandse vastgoedcopywriter. Herschrijf de ${typeLabel} voor dit object.

Objectgegevens:
- Adres: ${input.adres}
- Type: ${input.woningtype}, ${input.kamers} kamers, ${input.oppervlak_m2} m²
- Bouwjaar: ${input.bouwjaar} | Energielabel: ${input.energielabel}
- Vraagprijs: €${input.vraagprijs.toLocaleString('nl-NL')}
- USP's: ${input.usps}
- Doelgroep: ${input.doelgroep}

Huidige tekst:
${huidigeTekst}

${instructie ? `Herschrijfinstructie: ${instructie}` : 'Schrijf een volledig nieuwe, frisse versie — andere openingszin, andere opbouw, dezelfde feiten.'}

Geef ALLEEN de nieuwe tekst terug, verder niets. Geen uitleg, geen labels, geen aanhalingstekens.`
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id')
    .eq('id', user.id)
    .single()
  if (!makelaar) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  const { sleutel, instructie = '' } = await req.json() as { sleutel: string; instructie?: string }

  if (!sleutel || !(sleutel in SLEUTEL_CONTEXT)) {
    return NextResponse.json({ error: 'Ongeldig veld' }, { status: 400 })
  }

  const serviceClient = createServiceSupabaseClient()
  const { data: object } = await serviceClient
    .from('objecten')
    .select('input_json, outputs_json')
    .eq('id', params.id)
    .eq('kantoor_id', makelaar.kantoor_id)
    .single()

  if (!object) return NextResponse.json({ error: 'Object niet gevonden' }, { status: 404 })

  const input = object.input_json as PropertyInput
  const outputs = object.outputs_json as Record<string, string>
  const huidigeTekst = outputs[sleutel] ?? ''
  const taal = input.taal ?? 'nl'
  const ctx = SLEUTEL_CONTEXT[sleutel]

  const prompt = buildHerschrijfPrompt(sleutel, input, huidigeTekst, instructie, taal)

  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: ctx.maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })

  const nieuweTekst = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  // Sla de nieuwe tekst op in de outputs_json van dit object
  const nieuweOutputs = { ...outputs, [sleutel]: nieuweTekst }
  await serviceClient
    .from('objecten')
    .update({ outputs_json: nieuweOutputs })
    .eq('id', params.id)

  revalidatePath(`/object/${params.id}`)
  return NextResponse.json({ nieuweTekst })
}
