'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function toggleObjectStatus(objectId: string, huidigStatus: 'draft' | 'published') {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id')
    .eq('id', user.id)
    .single()

  if (!makelaar) return { ok: false, error: 'Geen rechten' }

  const nieuwStatus: 'draft' | 'published' = huidigStatus === 'draft' ? 'published' : 'draft'

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
