import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { meldFout } from '@/lib/fouten'
import type { ZoekWoning } from '@/lib/zoeken'
import { MIN_ZOEKLENGTE } from '@/lib/zoeken'
import { escapeIlike } from '@/lib/kantoorReset'

export type ZoekApiResultaat = { woningen: ZoekWoning[] }

/**
 * ⌘K-zoekpalet (components/ZoekPalet.tsx, roadmap § 9 backlog) — woningen-
 * groep. Alleen adres + fase, max. 8, altijd via de sessie-client
 * (`createServerSupabaseClient()`, RLS regelt de kantoorscheiding) plus een
 * expliciete `kantoor_id`-filter (zelfde dubbele zekerheid als
 * `app/(app)/woningen/page.tsx`). Onder `MIN_ZOEKLENGTE` (2 tekens) geen
 * lookup — zelfde gate als `lib/zoeken.ts` `toonTransactieSnelkoppeling()`,
 * zodat de eerste toets geen query triggert.
 *
 * Geen wijziging aan `lib/transactiesQuery.ts`/`transacties` hier — dit
 * bevraagt uitsluitend `makelaars`/`objecten`.
 */
export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (q.length < MIN_ZOEKLENGTE) {
    return NextResponse.json<ZoekApiResultaat>({ woningen: [] })
  }

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id')
    .eq('id', user.id)
    .single()
  if (!makelaar) return NextResponse.json<ZoekApiResultaat>({ woningen: [] })

  const { data, error } = await supabase
    .from('objecten')
    .select('id, address, fase')
    .eq('kantoor_id', makelaar.kantoor_id)
    // `%`/`_` in de zoekterm letterlijk nemen, niet als jokerteken (les 9.2)
    .ilike('address', `%${escapeIlike(q)}%`)
    .order('created_at', { ascending: false })
    .limit(8)

  if (error) {
    meldFout('zoeken', error)
    return NextResponse.json<ZoekApiResultaat>({ woningen: [] })
  }

  const woningen: ZoekWoning[] = (data ?? []).map(r => ({ id: r.id, adres: r.address, fase: r.fase }))
  return NextResponse.json<ZoekApiResultaat>({ woningen })
}
