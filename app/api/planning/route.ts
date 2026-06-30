import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

const PlanningInputSchema = z.object({
  object_id: z.string().uuid().nullable().optional(),
  platform: z.enum(['instagram', 'linkedin', 'email', 'overig']),
  content: z.string().min(1).max(5000),
  gepland_op: z.string().datetime(),
  notitie: z.string().max(500).optional(),
})

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

  const params = req.nextUrl.searchParams
  const van = params.get('van')
  const tot = params.get('tot')

  let query = supabase
    .from('post_planning')
    .select('id, object_id, platform, content, gepland_op, status, notitie, created_at, objecten(address)')
    .eq('kantoor_id', makelaar.kantoor_id)
    .order('gepland_op', { ascending: true })

  if (van) query = query.gte('gepland_op', van)
  if (tot) query = query.lte('gepland_op', tot)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ planning: data ?? [] })
}

export async function POST(req: NextRequest) {
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
  const parsed = PlanningInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer', details: parsed.error.issues }, { status: 400 })
  }

  const serviceClient = createServiceSupabaseClient()
  const { data, error } = await serviceClient
    .from('post_planning')
    .insert({ ...parsed.data, kantoor_id: makelaar.kantoor_id })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id }, { status: 201 })
}
