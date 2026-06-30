import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateWijkSeoTekst } from '@/lib/claude'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

const BodySchema = z.object({
  wijk: z.string().min(2).max(100),
  stad: z.string().min(2).max(100),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
})

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!makelaar || makelaar.role !== 'admin') {
    return NextResponse.json({ error: 'Geen rechten' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  const seoTekst = await generateWijkSeoTekst({ wijk: parsed.data.wijk, stad: parsed.data.stad })

  const serviceClient = createServiceSupabaseClient()
  const { error } = await serviceClient
    .from('wijken')
    .upsert({
      slug: parsed.data.slug,
      naam: parsed.data.wijk,
      stad: parsed.data.stad,
      seo_tekst: seoTekst,
      actief: true,
      bijgewerkt_op: new Date().toISOString(),
    }, { onConflict: 'slug' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, slug: parsed.data.slug })
}

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const serviceClient = createServiceSupabaseClient()
  const { data } = await serviceClient
    .from('wijken')
    .select('slug, naam, stad, actief, bijgewerkt_op')
    .order('bijgewerkt_op', { ascending: false })

  return NextResponse.json({ wijken: data ?? [] })
}

export async function DELETE(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!makelaar || makelaar.role !== 'admin') {
    return NextResponse.json({ error: 'Geen rechten' }, { status: 403 })
  }

  const { slug } = await req.json() as { slug: string }
  if (!slug) return NextResponse.json({ error: 'Slug verplicht' }, { status: 400 })

  const serviceClient = createServiceSupabaseClient()
  await serviceClient.from('wijken').delete().eq('slug', slug)
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!makelaar || makelaar.role !== 'admin') {
    return NextResponse.json({ error: 'Geen rechten' }, { status: 403 })
  }

  const { slug, actief } = await req.json()
  const serviceClient = createServiceSupabaseClient()
  await serviceClient.from('wijken').update({ actief }).eq('slug', slug)
  return NextResponse.json({ ok: true })
}
