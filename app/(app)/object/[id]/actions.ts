'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { ObjectFase } from '@/lib/schemas'

type ObjectStatus = 'draft' | 'published' | 'onder_bod' | 'verkocht'

/**
 * Fase-overgang van een woningdossier (besluit 16 sep 2026, zie CLAUDE.md §
 * Hoofdstructuur): Verkoopadvies → In verkoop → Verkocht. Geen pitch-concept
 * meer (item 1.9c, besluit Quinn 17 sep 2026) — de makelaar zet de fase zelf
 * handmatig door; verkocht blijft overal bij toegankelijk, alleen
 * archief-gelabeld.
 */
export async function setObjectFase(objectId: string, nieuweFase: ObjectFase) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id')
    .eq('id', user.id)
    .single()
  if (!makelaar) return { ok: false, error: 'Geen rechten' }

  const GELDIGE_FASES: ObjectFase[] = ['acquisitie', 'in_verkoop', 'verkocht']
  if (!GELDIGE_FASES.includes(nieuweFase)) return { ok: false, error: 'Ongeldige fase' }

  const update: { fase: ObjectFase; status?: ObjectStatus } = { fase: nieuweFase }
  if (nieuweFase === 'verkocht') update.status = 'verkocht'

  const { error } = await supabase
    .from('objecten')
    .update(update)
    .eq('id', objectId)
    .eq('kantoor_id', makelaar.kantoor_id)

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/object/${objectId}`)
  revalidatePath('/dashboard')
  revalidatePath('/woningen')
  return { ok: true, fase: nieuweFase }
}

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
  revalidatePath('/woningen')

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
    .select('kantoor_id')
    .eq('id', user.id)
    .single()

  if (!makelaar) return { ok: false, error: 'Geen rechten' }

  // Eén rol per kantoor (besluit 16 sep 2026, zie CLAUDE.md): iedereen mag elk
  // kantoor-object verwijderen, niet alleen de eigen woningen.
  const { error } = await supabase.from('objecten').delete().eq('id', objectId).eq('kantoor_id', makelaar.kantoor_id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/woningen')
  redirect('/woningen')
}
