import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

async function kantoorVanUser(supabase: ReturnType<typeof createServerSupabaseClient>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  return makelaar?.kantoor_id ?? null
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const kantoorId = await kantoorVanUser(supabase)
  if (!kantoorId) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const serviceClient = createServiceSupabaseClient()
  const { data } = await serviceClient
    .from('objecten')
    .select('chat_publiek, chat_foto_url')
    .eq('id', params.id)
    .eq('kantoor_id', kantoorId)
    .single()

  if (!data) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  return NextResponse.json({ chat_publiek: data.chat_publiek, chat_foto_url: data.chat_foto_url })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const kantoorId = await kantoorVanUser(supabase)
  if (!kantoorId) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  let body: { chat_publiek?: boolean; chat_foto_url?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }

  const serviceClient = createServiceSupabaseClient()
  const update: { chat_publiek?: boolean; chat_foto_url?: string | null } = {}

  if (typeof body.chat_publiek === 'boolean') update.chat_publiek = body.chat_publiek

  if ('chat_foto_url' in body) {
    if (body.chat_foto_url === null) {
      update.chat_foto_url = null
    } else if (typeof body.chat_foto_url === 'string') {
      // Alleen een foto uit de eigen bibliotheek van dit object mag de cover worden.
      const { data: foto } = await serviceClient
        .from('object_fotos')
        .select('id')
        .eq('object_id', params.id)
        .eq('kantoor_id', kantoorId)
        .eq('url', body.chat_foto_url)
        .maybeSingle()
      if (!foto) return NextResponse.json({ error: 'Onbekende foto' }, { status: 400 })
      update.chat_foto_url = body.chat_foto_url
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Niets om bij te werken' }, { status: 400 })
  }

  const { error } = await serviceClient
    .from('objecten')
    .update(update)
    .eq('id', params.id)
    .eq('kantoor_id', kantoorId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath(`/object/${params.id}`)
  return NextResponse.json({ ok: true })
}
