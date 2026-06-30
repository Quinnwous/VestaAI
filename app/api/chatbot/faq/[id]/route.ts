import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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

  const serviceClient = createServiceSupabaseClient()
  const { error } = await serviceClient
    .from('chatbot_faq')
    .delete()
    .eq('id', params.id)
    .eq('kantoor_id', makelaar.kantoor_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
