import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

const FaqSchema = z.object({
  kantoor_id: z.string().uuid(),
  vraag: z.string().min(5).max(500),
  antwoord: z.string().min(5).max(2000),
  volgorde: z.number().int().min(0).optional(),
})

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('role, kantoor_id')
    .eq('id', user.id)
    .single()

  if (!makelaar || makelaar.role !== 'admin') {
    return NextResponse.json({ error: 'Geen rechten' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = FaqSchema.safeParse(body)
  if (!parsed.success || parsed.data.kantoor_id !== makelaar.kantoor_id) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  const serviceClient = createServiceSupabaseClient()
  const { data, error } = await serviceClient
    .from('chatbot_faq')
    .insert(parsed.data)
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id }, { status: 201 })
}
