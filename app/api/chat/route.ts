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

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!rateLimitOk(ip)) {
    return NextResponse.json({ error: 'Even wachten voor het volgende bericht.' }, { status: 429 })
  }

  let body: { kantoor_id: string; berichten: { rol: 'user' | 'assistant'; tekst: string }[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }

  const { kantoor_id, berichten } = body
  if (!kantoor_id || !Array.isArray(berichten) || berichten.length === 0) {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }

  const serviceClient = createServiceSupabaseClient()

  // Kantoor-info + FAQ ophalen
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
    ? '\n\nVeelgestelde vragen:\n' + faqItems.map((f, i) => `${i + 1}. V: ${f.vraag}\n   A: ${f.antwoord}`).join('\n\n')
    : ''

  const schrijftoon = kantoor.huisstijl_json?.schrijftoon ?? 'informeel'
  const toonBeschrijving = schrijftoon === 'formeel'
    ? 'formeel en professioneel — gebruik "u"'
    : schrijftoon === 'enthousiast'
      ? 'enthousiast en warm — gebruik "je"'
      : 'vriendelijk en toegankelijk — gebruik "je"'

  const systemPrompt = `Je bent een vriendelijke chatbot-assistent voor ${kantoor.name}, een makelaarskantoor in Nederland.
Jouw taak: beantwoord vragen van potentiële kopers en verkopers over het kantoor en vastgoed in het algemeen.
Schrijftoon: ${toonBeschrijving}.
Wees beknopt (max 3 zinnen per antwoord).
Als je een vraag niet kunt beantwoorden, stel dan voor om contact op te nemen met het kantoor.
Als de bezoeker interesse toont in een afspraak of bezichtiging, vraag dan vriendelijk om zijn/haar naam en e-mailadres zodat het kantoor contact kan opnemen.${faqTekst}`

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
