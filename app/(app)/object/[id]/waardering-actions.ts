'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

type Correctie = { waarde: number; motivatie: string; datum: string }
type Result = { ok: true } | { ok: false; error: string }

/**
 * Makelaar-correctie op de berekende waardebepaling (F7, besluit 16 sep
 * 2026): bijsturen mag, maar altijd met een motivatie — die gaat mee het
 * verkoopadvies in en is voor Quinn terug te zien om te toetsen waar het
 * model structureel misziet.
 */
export async function slaWaarderingCorrectieOp(
  objectId: string, waarde: number, motivatie: string,
): Promise<Result & { correctie?: Correctie }> {
  if (!Number.isFinite(waarde) || waarde <= 0) return { ok: false, error: 'Ongeldige waarde' }
  if (!motivatie.trim()) return { ok: false, error: 'Geef een korte motivatie voor de bijstelling' }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  if (!makelaar) return { ok: false, error: 'Geen rechten' }

  const service = createServiceSupabaseClient()
  const { data: object } = await service
    .from('objecten')
    .select('waardering_json')
    .eq('id', objectId)
    .eq('kantoor_id', makelaar.kantoor_id)
    .single()
  if (!object) return { ok: false, error: 'Woning niet gevonden' }

  const bestaand = (object.waardering_json as Record<string, unknown> | null) ?? {}
  const correctie = { waarde: Math.round(waarde), motivatie: motivatie.trim().slice(0, 1000), datum: new Date().toISOString() }

  const { error } = await service
    .from('objecten')
    .update({ waardering_json: { ...bestaand, correctie } })
    .eq('id', objectId)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/object/${objectId}`)
  return { ok: true, correctie }
}

export async function verwijderWaarderingCorrectie(objectId: string): Promise<Result> {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  if (!makelaar) return { ok: false, error: 'Geen rechten' }

  const service = createServiceSupabaseClient()
  const { data: object } = await service
    .from('objecten')
    .select('waardering_json')
    .eq('id', objectId)
    .eq('kantoor_id', makelaar.kantoor_id)
    .single()
  if (!object) return { ok: false, error: 'Woning niet gevonden' }

  const bestaand = { ...(object.waardering_json as Record<string, unknown> | null) }
  delete bestaand.correctie

  const { error } = await service.from('objecten').update({ waardering_json: bestaand }).eq('id', objectId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/object/${objectId}`)
  return { ok: true }
}
