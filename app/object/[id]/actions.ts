'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'

type ObjectStatus = 'draft' | 'published' | 'onder_bod' | 'verkocht'

export async function setObjectStatus(objectId: string, nieuwStatus: ObjectStatus) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id')
    .eq('id', user.id)
    .single()

  if (!makelaar) return { ok: false, error: 'Geen rechten' }

  const GELDIGE_STATUSSEN: ObjectStatus[] = ['draft', 'published', 'onder_bod', 'verkocht']
  if (!GELDIGE_STATUSSEN.includes(nieuwStatus)) return { ok: false, error: 'Ongeldige status' }

  const { error } = await supabase
    .from('objecten')
    .update({ status: nieuwStatus })
    .eq('id', objectId)
    .eq('kantoor_id', makelaar.kantoor_id)

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/object/${objectId}`)
  revalidatePath('/dashboard')

  return { ok: true, status: nieuwStatus }
}

export async function toggleObjectStatus(objectId: string, huidigStatus: ObjectStatus) {
  const volgorde: ObjectStatus[] = ['draft', 'published', 'onder_bod', 'verkocht']
  const huidigIndex = volgorde.indexOf(huidigStatus)
  const nieuwStatus = volgorde[(huidigIndex + 1) % volgorde.length]
  return setObjectStatus(objectId, nieuwStatus)
}

export async function deleteObject(objectId: string) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id, role')
    .eq('id', user.id)
    .single()

  if (!makelaar) return { ok: false, error: 'Geen rechten' }

  // Admin mag alle kantoor-objecten verwijderen; makelaar alleen zijn eigen
  const { error } = makelaar.role === 'admin'
    ? await supabase.from('objecten').delete().eq('id', objectId).eq('kantoor_id', makelaar.kantoor_id)
    : await supabase.from('objecten').delete().eq('id', objectId).eq('kantoor_id', makelaar.kantoor_id).eq('makelaar_id', user.id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
