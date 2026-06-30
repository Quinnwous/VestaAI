import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

export const maxDuration = 60

const TOEGESTANE_TYPES = ['application/pdf', 'text/plain']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

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

  const formData = await req.formData()
  const bestand = formData.get('bestand') as File | null
  const objectId = formData.get('object_id') as string | null

  if (!bestand) return NextResponse.json({ error: 'Geen bestand aangeleverd' }, { status: 400 })
  if (!TOEGESTANE_TYPES.includes(bestand.type)) {
    return NextResponse.json({ error: 'Alleen PDF of TXT toegestaan' }, { status: 400 })
  }
  if (bestand.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Bestand mag maximaal 10 MB zijn' }, { status: 400 })
  }

  const bytes = await bestand.arrayBuffer()
  const serviceClient = createServiceSupabaseClient()

  // 1. Opslaan in Supabase Storage (privé bucket)
  const pad = `${makelaar.kantoor_id}/documenten/${Date.now()}-${bestand.name}`
  const { error: uploadError } = await serviceClient.storage
    .from('kantoor-assets')
    .upload(pad, bytes, { contentType: bestand.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  // 2. Uploaden naar Anthropic Files API voor efficiënte hergebruik
  let anthropicFileId: string | null = null
  try {
    const client = new Anthropic()
    const file = await client.beta.files.upload({
      file: new File([bytes], bestand.name, { type: bestand.type }),
    })
    anthropicFileId = file.id
  } catch {
    // Niet-blokkerend: als Files API mislukt, gebruiken we de bytes direct bij chat
  }

  // 3. Record opslaan in DB
  const { data: doc, error: dbError } = await serviceClient
    .from('object_documenten')
    .insert({
      object_id: objectId ?? null,
      kantoor_id: makelaar.kantoor_id,
      bestandsnaam: bestand.name,
      storage_pad: pad,
      mime_type: bestand.type,
      grootte_bytes: bestand.size,
      anthropic_file_id: anthropicFileId,
    })
    .select('id, bestandsnaam, grootte_bytes, anthropic_file_id')
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json(doc, { status: 201 })
}
