import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

async function kantoorVanUser(supabase: ReturnType<typeof createServerSupabaseClient>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  return makelaar?.kantoor_id ?? null
}

// Foto uit de bibliotheek verwijderen (record + storage-bestand).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; fotoId: string } }) {
  const supabase = createServerSupabaseClient()
  const kantoorId = await kantoorVanUser(supabase)
  if (!kantoorId) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const serviceClient = createServiceSupabaseClient()
  const { data: foto } = await serviceClient
    .from('object_fotos')
    .select('id, storage_pad')
    .eq('id', params.fotoId)
    .eq('object_id', params.id)
    .eq('kantoor_id', kantoorId)
    .single()
  if (!foto) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  // Storage best-effort — het record verwijderen is leidend.
  if (foto.storage_pad) {
    await serviceClient.storage.from('kantoor-assets').remove([foto.storage_pad]).catch(() => {})
  }

  const { error } = await serviceClient.from('object_fotos').delete().eq('id', params.fotoId).eq('kantoor_id', kantoorId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
