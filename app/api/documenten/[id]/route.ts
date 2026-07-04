import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

// Zet per document de "publiek chatbaar"-vlag aan/uit (opt-in voor de publieke object-chatbot).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id')
    .eq('id', user.id)
    .single()
  if (!makelaar) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  let body: { publiek_chatbaar?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }

  const serviceClient = createServiceSupabaseClient()
  const { error } = await serviceClient
    .from('object_documenten')
    .update({ publiek_chatbaar: !!body.publiek_chatbaar })
    .eq('id', params.id)
    .eq('kantoor_id', makelaar.kantoor_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
