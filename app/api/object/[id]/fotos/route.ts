import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

const SOORTEN = new Set(['origineel', 'verbeterd', 'gestaged'])
const MAX_BYTES = 12 * 1024 * 1024

async function kantoorVanUser(supabase: ReturnType<typeof createServerSupabaseClient>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  return makelaar?.kantoor_id ?? null
}

// Foto's in de bibliotheek van dit object.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const kantoorId = await kantoorVanUser(supabase)
  if (!kantoorId) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const serviceClient = createServiceSupabaseClient()
  const { data, error } = await serviceClient
    .from('object_fotos')
    .select('id, url, soort, bestandsnaam, created_at')
    .eq('object_id', params.id)
    .eq('kantoor_id', kantoorId)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ fotos: data ?? [] })
}

// Een (verbeterde/gestagede) foto uit de tools bewaren in de bibliotheek.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const kantoorId = await kantoorVanUser(supabase)
  if (!kantoorId) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  let body: { dataUrl?: string; soort?: string; bestandsnaam?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }

  const match = /^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/.exec(body.dataUrl ?? '')
  if (!match) return NextResponse.json({ error: 'Ongeldige afbeelding' }, { status: 400 })
  const mime = match[1]
  const bytes = Buffer.from(match[2], 'base64')
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Afbeelding te groot of leeg' }, { status: 400 })
  }
  const soort = SOORTEN.has(body.soort ?? '') ? body.soort! : 'verbeterd'

  const serviceClient = createServiceSupabaseClient()

  // Object binnen het eigen kantoor verifiëren.
  const { data: object } = await serviceClient
    .from('objecten')
    .select('id')
    .eq('id', params.id)
    .eq('kantoor_id', kantoorId)
    .single()
  if (!object) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
  const pad = `${kantoorId}/object-fotos/${params.id}/lib/${randomUUID()}.${ext}`

  const { error: uploadError } = await serviceClient.storage
    .from('kantoor-assets')
    .upload(pad, bytes, { contentType: mime, upsert: false })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: urlData } = serviceClient.storage.from('kantoor-assets').getPublicUrl(pad)

  const { data: rij, error } = await serviceClient
    .from('object_fotos')
    .insert({
      object_id: params.id,
      kantoor_id: kantoorId,
      url: urlData.publicUrl,
      storage_pad: pad,
      soort,
      bestandsnaam: body.bestandsnaam?.slice(0, 200) ?? null,
    })
    .select('id, url, soort, bestandsnaam, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(rij, { status: 201 })
}
