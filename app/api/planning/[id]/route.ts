import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

const UpdateSchema = z.object({
  status: z.enum(['gepland', 'gepubliceerd', 'geannuleerd']).optional(),
  gepland_op: z.string().datetime().optional(),
  notitie: z.string().max(500).optional(),
})

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

  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  const serviceClient = createServiceSupabaseClient()
  const { error } = await serviceClient
    .from('post_planning')
    .update(parsed.data)
    .eq('id', params.id)
    .eq('kantoor_id', makelaar.kantoor_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id')
    .eq('id', user.id)
    .single()
  if (!makelaar) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  const serviceClient = createServiceSupabaseClient()
  const { error } = await serviceClient
    .from('post_planning')
    .delete()
    .eq('id', params.id)
    .eq('kantoor_id', makelaar.kantoor_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
