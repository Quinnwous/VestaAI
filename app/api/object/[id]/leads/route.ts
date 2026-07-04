import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

async function kantoorVanUser(supabase: ReturnType<typeof createServerSupabaseClient>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  return makelaar?.kantoor_id ?? null
}

// Leads die via de deel-chatbot bij dit object zijn binnengekomen.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const kantoorId = await kantoorVanUser(supabase)
  if (!kantoorId) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const serviceClient = createServiceSupabaseClient()
  const { data, error } = await serviceClient
    .from('chatbot_leads')
    .select('id, naam, email, telefoon, bericht, created_at')
    .eq('object_id', params.id)
    .eq('kantoor_id', kantoorId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ leads: data ?? [] })
}
