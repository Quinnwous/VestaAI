import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceSupabaseClient } from '@/lib/supabase'

const LeadSchema = z.object({
  kantoor_id: z.string().uuid(),
  naam: z.string().max(100).optional(),
  email: z.string().email().max(200),
  bericht: z.string().max(1000).optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }

  const parsed = LeadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  const serviceClient = createServiceSupabaseClient()
  const { error } = await serviceClient
    .from('chatbot_leads')
    .insert(parsed.data)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}
