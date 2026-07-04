import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

// Lijst de (bewaarde) documenten van één object — inclusief de publiek-chatbaar-vlag.
export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id')
    .eq('id', user.id)
    .single()
  if (!makelaar) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  const objectId = req.nextUrl.searchParams.get('object_id')
  if (!objectId) return NextResponse.json({ documenten: [] })

  const serviceClient = createServiceSupabaseClient()
  const { data } = await serviceClient
    .from('object_documenten')
    .select('id, bestandsnaam, grootte_bytes, anthropic_file_id, publiek_chatbaar')
    .eq('object_id', objectId)
    .eq('kantoor_id', makelaar.kantoor_id)

  return NextResponse.json({ documenten: data ?? [] })
}
