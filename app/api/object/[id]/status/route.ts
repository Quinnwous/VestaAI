import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * Pollingroute voor de content-generatiestatus van een dossier (item 3.1,
 * docs/roadmap.md § 3.2) — `ContentTekstenTab` (components/ObjectWorkspace.tsx)
 * pollt hier elke 3s zolang `content_status = 'bezig'`. Via de sessie-
 * gebonden client (RLS regelt de kantoorscheiding), met een expliciete
 * `.eq('kantoor_id', …)` als defense-in-depth, consistent met de rest van de
 * `app/api/object/[id]/*`-routes.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id')
    .eq('id', user.id)
    .single()
  if (!makelaar) return NextResponse.json({ error: 'Geen rechten' }, { status: 403 })

  const { data: object, error } = await supabase
    .from('objecten')
    .select('content_status, content_gegenereerd_op')
    .eq('id', params.id)
    .eq('kantoor_id', makelaar.kantoor_id)
    .single()

  if (error || !object) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  return NextResponse.json({
    content_status: object.content_status,
    content_gegenereerd_op: object.content_gegenereerd_op,
  })
}
