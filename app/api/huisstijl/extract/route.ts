import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase'

export const maxDuration = 60

const TOEGESTAAN = ['application/pdf', 'text/plain']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

// Haalt platte tekst uit een geüpload voorbeeld (Funda-tekst/brochure) zodat de makelaar
// een bestand kan uploaden i.p.v. tekst te plakken. TXT direct; PDF via de Files API.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const form = await req.formData()
  const bestand = form.get('bestand') as File | null
  if (!bestand || bestand.size === 0) return NextResponse.json({ error: 'Geen bestand' }, { status: 400 })
  if (!TOEGESTAAN.includes(bestand.type)) return NextResponse.json({ error: 'Alleen PDF of TXT' }, { status: 400 })
  if (bestand.size > MAX_BYTES) return NextResponse.json({ error: 'Bestand mag maximaal 10 MB zijn' }, { status: 400 })

  if (bestand.type === 'text/plain') {
    const tekst = (await bestand.text()).trim()
    return NextResponse.json({ tekst })
  }

  // PDF → tekst via de Anthropic Files API (zelfde patroon als de documenten-assistent).
  try {
    const bytes = await bestand.arrayBuffer()
    const client = new Anthropic()
    const file = await client.beta.files.upload({
      file: new File([bytes], bestand.name, { type: bestand.type }),
    })
    const raw = await (client.beta.messages.create as unknown as (p: Record<string, unknown>) => Promise<Anthropic.Beta.Messages.BetaMessage>)({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system: 'Je extraheert platte tekst uit een document. Geef uitsluitend de lopende tekst terug — geen opmaak, geen koppen-markering, geen inleiding of commentaar.',
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'file', file_id: file.id } },
          { type: 'text', text: 'Geef de volledige lopende tekst uit dit document terug als platte tekst.' },
        ],
      }],
      betas: ['files-api-2025-04-14'],
    })
    const tekst = raw.content?.[0]?.type === 'text' ? raw.content[0].text.trim() : ''
    if (!tekst) return NextResponse.json({ error: 'Geen tekst gevonden in de PDF' }, { status: 422 })
    return NextResponse.json({ tekst })
  } catch {
    return NextResponse.json({ error: 'Kon de tekst niet uit de PDF halen — plak de tekst desnoods handmatig.' }, { status: 500 })
  }
}
