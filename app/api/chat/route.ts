import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceSupabaseClient } from '@/lib/supabase'

export const maxDuration = 30

const CHAT_RATE_LIMIT = new Map<string, number>()
const CHAT_RATE_MS = 5_000

function rateLimitOk(ip: string): boolean {
  const last = CHAT_RATE_LIMIT.get(ip) ?? 0
  if (Date.now() - last < CHAT_RATE_MS) return false
  CHAT_RATE_LIMIT.set(ip, Date.now())
  return true
}

// Bouwt een compacte kennisbasis over één specifieke woning uit de invoer + gegenereerde output.
function buildObjectContext(
  address: string,
  inp: Record<string, unknown>,
  out: Record<string, unknown> | null,
): string {
  const prijs = typeof inp.vraagprijs === 'number' ? `€${inp.vraagprijs.toLocaleString('nl-NL')}` : undefined
  const feiten = [
    `Adres: ${address}`,
    inp.woningtype && `Type: ${inp.woningtype}`,
    inp.kamers && `Kamers: ${inp.kamers}`,
    inp.oppervlak_m2 && `Woonoppervlak: ${inp.oppervlak_m2} m²`,
    inp.bouwjaar && `Bouwjaar: ${inp.bouwjaar}`,
    inp.energielabel && `Energielabel: ${inp.energielabel}`,
    prijs && `Vraagprijs: ${prijs}`,
    inp.usps && `Bijzonderheden/USP's: ${inp.usps}`,
    inp.doelgroep && `Beoogde doelgroep: ${inp.doelgroep}`,
  ].filter(Boolean).join('\n')

  let ctx = `\n\nJe beantwoordt vragen over DEZE specifieke woning:\n${feiten}`
  if (out?.buurtomschrijving) ctx += `\n\nOver de buurt:\n${out.buurtomschrijving}`
  if (out?.energie_advies) ctx += `\n\nEnergie & duurzaamheid:\n${out.energie_advies}`
  if (out?.kopersvragen_faq) ctx += `\n\nVeelgestelde vragen over deze woning:\n${out.kopersvragen_faq}`
  return ctx
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!rateLimitOk(ip)) {
    return NextResponse.json({ error: 'Even wachten voor het volgende bericht.' }, { status: 429 })
  }

  let body: { kantoor_id?: string; object_id?: string; berichten: { rol: 'user' | 'assistant'; tekst: string }[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }

  const { object_id, berichten } = body
  let kantoor_id = body.kantoor_id
  if (!Array.isArray(berichten) || berichten.length === 0) {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }

  const serviceClient = createServiceSupabaseClient()

  // Object-context: bij een object_id halen we de woninggegevens op. Het kantoor van
  // het object is leidend (voorkomt een mismatch met een meegestuurde kantoor_id).
  let objectContext = ''
  let objectAdres: string | null = null
  if (object_id) {
    const { data: object } = await serviceClient
      .from('objecten')
      .select('kantoor_id, address, input_json, outputs_json')
      .eq('id', object_id)
      .single()
    if (object) {
      kantoor_id = object.kantoor_id
      objectAdres = object.address
      objectContext = buildObjectContext(
        object.address,
        (object.input_json ?? {}) as Record<string, unknown>,
        (object.outputs_json ?? null) as Record<string, unknown> | null,
      )
    }
  }

  if (!kantoor_id) {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }

  const { data: kantoor } = await serviceClient
    .from('kantoren')
    .select('name, huisstijl_json')
    .eq('id', kantoor_id)
    .single()

  if (!kantoor) {
    return NextResponse.json({ error: 'Kantoor niet gevonden' }, { status: 404 })
  }

  const { data: faqItems } = await serviceClient
    .from('chatbot_faq')
    .select('vraag, antwoord')
    .eq('kantoor_id', kantoor_id)
    .order('volgorde', { ascending: true })
    .limit(30)

  const faqTekst = faqItems && faqItems.length > 0
    ? '\n\nVeelgestelde vragen (kantoorbreed):\n' + faqItems.map((f, i) => `${i + 1}. V: ${f.vraag}\n   A: ${f.antwoord}`).join('\n\n')
    : ''

  const schrijftoon = kantoor.huisstijl_json?.schrijftoon ?? 'informeel'
  const toonBeschrijving = schrijftoon === 'formeel'
    ? 'formeel en professioneel — gebruik "u"'
    : schrijftoon === 'enthousiast'
      ? 'enthousiast en warm — gebruik "je"'
      : 'vriendelijk en toegankelijk — gebruik "je"'

  const taak = objectAdres
    ? `Jouw taak: beantwoord vragen van geïnteresseerden over de woning aan ${objectAdres}. Baseer je uitsluitend op de woninggegevens hieronder en de kantoor-FAQ. Verzin geen feiten die er niet staan. Voor vragen over bezichtiging, beschikbaarheid, biedingen of onderhandeling verwijs je vriendelijk naar de makelaar.`
    : 'Jouw taak: beantwoord vragen van potentiële kopers en verkopers over het kantoor en vastgoed in het algemeen.'

  const systemPrompt = `Je bent een vriendelijke chatbot-assistent voor ${kantoor.name}, een makelaarskantoor in Nederland.
${taak}
Schrijftoon: ${toonBeschrijving}.
Wees beknopt (max 4 zinnen per antwoord).
Als je een vraag niet kunt beantwoorden, stel dan voor om contact op te nemen met het kantoor.
Als de bezoeker interesse toont in een afspraak of bezichtiging, vraag dan vriendelijk om zijn/haar naam en e-mailadres zodat het kantoor contact kan opnemen.${objectContext}${faqTekst}`

  const client = new Anthropic()

  const messages = berichten.map(b => ({
    role: b.rol as 'user' | 'assistant',
    content: b.tekst,
  }))

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: systemPrompt,
    messages,
  })

  const antwoord = message.content[0].type === 'text' ? message.content[0].text : ''
  return NextResponse.json({ antwoord })
}
