import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { extraheerUsps } from '@/lib/claude'
import type { PropertyInput } from '@/lib/schemas'

export const maxDuration = 30

/**
 * AI USP-extractor (F7, zie CLAUDE.md § Hoofdstructuur): vertaalt het vrije
 * tekstveld uit de intake naar gestructureerde USP's. Los, klein Claude-
 * prompt-ontwerp naast de hoofdwaardering.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  if (!makelaar) return NextResponse.json({ error: 'Geen rechten' }, { status: 403 })

  const serviceClient = createServiceSupabaseClient()
  const { data: object } = await serviceClient
    .from('objecten')
    .select('input_json')
    .eq('id', params.id)
    .eq('kantoor_id', makelaar.kantoor_id)
    .single()
  if (!object) return NextResponse.json({ error: 'Woning niet gevonden' }, { status: 404 })

  const vrijeTekst = (object.input_json as PropertyInput).usps ?? ''
  try {
    const usps = await extraheerUsps(vrijeTekst)
    await serviceClient.from('objecten').update({ usps_structuur: usps }).eq('id', params.id)
    return NextResponse.json({ usps })
  } catch {
    return NextResponse.json({ error: 'USP-extractie mislukt. Probeer het opnieuw.' }, { status: 500 })
  }
}
