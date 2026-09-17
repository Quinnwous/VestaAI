import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { CONTENT_VERGRENDELD, contentVergrendeldAntwoord } from '@/lib/features'
import { genereerContentVoorObject } from '@/lib/contentGeneratie'
import { meldFout } from '@/lib/fouten'

export const maxDuration = 300

/**
 * "Genereer content voor dossier-id" (item 3.1, docs/roadmap.md § 3.2) — niet
 * meer de aanmaakroute (dat is `POST /api/object` sinds hetzelfde item). Body
 * is nu `{ objectId }` i.p.v. de volledige intake; de kernlogica (lock,
 * Claude-call, opslaan) zit in lib/contentGeneratie.ts zodat ook de
 * fire-and-forget-trigger bij de fase-overgang naar In verkoop
 * (components/DossierHeader.tsx) 'm via deze route kan aanroepen.
 */
export async function POST(req: NextRequest) {
  // Contentsuite is vergrendeld (koerswijziging sept 2026) — zie lib/features.ts.
  if (CONTENT_VERGRENDELD) return contentVergrendeldAntwoord()

  let body: { objectId?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  const objectId = body.objectId
  if (typeof objectId !== 'string' || !objectId) {
    return NextResponse.json({ error: 'objectId is verplicht' }, { status: 400 })
  }

  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

    const { data: makelaar } = await supabase
      .from('makelaars')
      .select('kantoor_id')
      .eq('id', user.id)
      .single()
    if (!makelaar) return NextResponse.json({ error: 'Geen rechten' }, { status: 403 })

    const resultaat = await genereerContentVoorObject(objectId, makelaar.kantoor_id)
    if (!resultaat.ok) {
      return NextResponse.json({ error: resultaat.error }, { status: resultaat.status })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    const ref = meldFout('generate:route', error, { objectId })
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    return NextResponse.json({ error: message, ref }, { status: 500 })
  }
}
