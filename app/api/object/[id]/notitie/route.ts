import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

export async function PATCH(
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

  const { notitie } = await req.json() as { notitie: string }
  if (typeof notitie !== 'string' || notitie.length > 2000) {
    return NextResponse.json({ error: 'Ongeldige notitie (max 2000 tekens)' }, { status: 400 })
  }

  const serviceClient = createServiceSupabaseClient()
  const { error } = await serviceClient
    .from('objecten')
    .update({ notitie: notitie || null })
    .eq('id', params.id)
    .eq('kantoor_id', makelaar.kantoor_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath(`/object/${params.id}`)
  return NextResponse.json({ ok: true })
}
