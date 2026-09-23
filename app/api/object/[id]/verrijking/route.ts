import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { fetchVerrijking } from '@/lib/verrijking'
import { naarVerrijkingOpslag } from '@/lib/verrijkingOpslag'
import { PropertyInputSchema } from '@/lib/schemas'
import { meldFout } from '@/lib/fouten'

export const maxDuration = 30

/**
 * (Opnieuw) ophalen en opslaan van de buurtdata bij een dossier — item 10.3,
 * docs/roadmap.md § fase 10: WOZ, CBS-buurtcijfers, voorzieningen en het
 * marktprofiel uit lib/verrijking.ts, met tijdstempel "opgehaald op" op
 * `objecten.verrijking_json`. Dezelfde route bedient twee aanroepers:
 *
 * 1. Een fire-and-forget aanroep (`keepalive: true`, niet ge-awaited) vanuit
 *    `NewObjectForm.tsx` vlak na het aanmaken van een dossier — bewust NIET
 *    verwerkt in `POST /api/object` zelf, dat blijft de <5s-belofte van item
 *    3.1 houden (fetchVerrijking doet drie parallelle externe calls met
 *    oplopend tot 10s timeout).
 * 2. De "Ververs"-knop in `components/BuurtDataTab.tsx`, voor bestaande
 *    dossiers zonder (of met verouderde) buurtdata.
 *
 * ⚠️ Werkt alleen na de migratie `20260923_object_verrijking.sql` (kolom
 * `objecten.verrijking_json`). Zolang die niet is toegepast faalt de update
 * met Postgres-foutcode 42703 (undefined_column) — expliciet afgevangen
 * hieronder zodat dit duidelijk meldt i.p.v. een generieke 500 te geven.
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
    .select('id, address, input_json')
    .eq('id', params.id)
    .eq('kantoor_id', makelaar.kantoor_id)
    .single()
  if (!object) return NextResponse.json({ error: 'Woning niet gevonden' }, { status: 404 })

  const invoer = PropertyInputSchema.safeParse(object.input_json)
  const oppervlak = invoer.success ? invoer.data.oppervlak_m2 : undefined

  try {
    const data = await fetchVerrijking(object.address, oppervlak)
    const opslag = naarVerrijkingOpslag(data, new Date().toISOString())

    const { error } = await serviceClient
      .from('objecten')
      .update({ verrijking_json: opslag })
      .eq('id', params.id)
      .eq('kantoor_id', makelaar.kantoor_id)

    if (error) {
      // Postgres zelf geeft 42703 (undefined_column) terug; PostgREST/Supabase-js
      // vertaalt een onbekende kolom bij een update vaker naar PGRST204
      // ("Could not find the '…' column … in the schema cache") — beide zijn
      // hier hetzelfde signaal: de migratie is nog niet toegepast.
      if (error.code === '42703' || error.code === 'PGRST204') {
        return NextResponse.json(
          {
            error: 'Buurtdata kon niet opgeslagen worden: de migratie voor objecten.verrijking_json is nog niet toegepast.',
            migratieVereist: true,
          },
          { status: 503 },
        )
      }
      const ref = meldFout('object/[id]/verrijking:opslaan', error, { objectId: params.id })
      return NextResponse.json({ error: error.message, ref }, { status: 500 })
    }

    revalidatePath(`/object/${params.id}`)
    return NextResponse.json({ verrijking: opslag })
  } catch (error) {
    const ref = meldFout('object/[id]/verrijking', error, { objectId: params.id })
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    return NextResponse.json({ error: message, ref }, { status: 500 })
  }
}
