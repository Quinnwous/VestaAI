import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

const TOEGESTAAN = ['image/jpeg', 'image/png', 'image/webp']

async function kantoorVanUser(supabase: ReturnType<typeof createServerSupabaseClient>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  return makelaar?.kantoor_id ?? null
}

// Cover-foto voor de publieke chatpagina uploaden.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const kantoorId = await kantoorVanUser(supabase)
  if (!kantoorId) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const formData = await req.formData()
  const bestand = formData.get('foto') as File | null
  if (!bestand || bestand.size === 0) {
    return NextResponse.json({ error: 'Geen bestand' }, { status: 400 })
  }
  if (!TOEGESTAAN.includes(bestand.type)) {
    return NextResponse.json({ error: 'Alleen JPG, PNG of WebP' }, { status: 400 })
  }
  if (bestand.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Foto mag maximaal 5 MB zijn' }, { status: 400 })
  }

  const serviceClient = createServiceSupabaseClient()

  // Verifieer dat het object bij dit kantoor hoort.
  const { data: object } = await serviceClient
    .from('objecten')
    .select('id')
    .eq('id', params.id)
    .eq('kantoor_id', kantoorId)
    .single()
  if (!object) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  const ext = bestand.type === 'image/png' ? 'png' : bestand.type === 'image/webp' ? 'webp' : 'jpg'
  const pad = `${kantoorId}/object-fotos/${params.id}.${ext}`
  const bytes = await bestand.arrayBuffer()

  const { error: uploadError } = await serviceClient.storage
    .from('kantoor-assets')
    .upload(pad, bytes, { contentType: bestand.type, upsert: true })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: urlData } = serviceClient.storage.from('kantoor-assets').getPublicUrl(pad)
  // Versie-query forceert een verse render na een nieuwe upload op hetzelfde pad.
  const url = `${urlData.publicUrl}?v=${Date.now()}`

  const { error } = await serviceClient
    .from('objecten')
    .update({ chat_foto_url: url })
    .eq('id', params.id)
    .eq('kantoor_id', kantoorId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath(`/object/${params.id}`)
  return NextResponse.json({ url })
}

// Cover-foto verwijderen.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const kantoorId = await kantoorVanUser(supabase)
  if (!kantoorId) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const serviceClient = createServiceSupabaseClient()
  const { error } = await serviceClient
    .from('objecten')
    .update({ chat_foto_url: null })
    .eq('id', params.id)
    .eq('kantoor_id', kantoorId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath(`/object/${params.id}`)
  return NextResponse.json({ ok: true })
}
