import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { haalEigenVerkopen, MET_COORDINATEN_KOLOMMEN } from '@/lib/transactiesQuery'
import { ObjectWorkspace } from '@/components/ObjectWorkspace'
import { DossierHeader } from '@/components/DossierHeader'
import { InvoerToggle } from './InvoerToggle'
import { DeleteButton } from './DeleteButton'
import { RegenereerButton } from './RegenereerButton'
import { AppPagina } from '@/components/ui'
import type { ContentOutput, ObjectContentStatus, ObjectFase, PropertyInput } from '@/lib/schemas'
import { migreerWaarderingJson } from '@/lib/waardering'
import { verwerkOpgeslagenVerrijking } from '@/lib/verrijkingOpslag'
import type { TransactieMetCoordinaten } from '@/lib/supabase'

const getCachedObject = unstable_cache(
  async (objectId: string) => {
    const serviceClient = createServiceSupabaseClient()
    const { data } = await serviceClient
      .from('objecten')
      .select('id, kantoor_id, address, status, fase, fase_sinds, input_json, outputs_json, outputs_json_en, created_at, notitie, lat, lng, waardering_json, usps_structuur, content_status, content_gegenereerd_op, content_bezig_sinds')
      .eq('id', objectId)
      .single()
    return data
  },
  ['object-detail'],
  { revalidate: 86400 },
)

export async function generateMetadata({ params }: { params: { id: string } }) {
  const object = await getCachedObject(params.id)
  if (!object) return { title: 'Woning niet gevonden' }
  return {
    title: object.address,
    description: `Woningdossier voor ${object.address}`,
  }
}

export default async function ObjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [object, makelaar, verrijkingRuw] = await Promise.all([
    getCachedObject(params.id),
    supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single().then(r => r.data),
    // Item 10.3: losse, ongecachete query t.o.v. getCachedObject hierboven —
    // faalt gracieus (catch) zolang de migratie voor objecten.verrijking_json
    // nog niet is toegepast, zonder de rest van deze pagina te raken. De
    // verwerking (validatie/undefined_column-afhandeling) is een pure functie
    // in lib/verrijkingOpslag.ts, los te testen.
    (async () => {
      try {
        const r = await createServiceSupabaseClient().from('objecten').select('verrijking_json').eq('id', params.id).single()
        return { data: r.data, error: r.error }
      } catch {
        return { data: null, error: null }
      }
    })(),
  ])
  const verrijkingInitieel = verwerkOpgeslagenVerrijking(verrijkingRuw)

  if (!object || !makelaar || object.kantoor_id !== makelaar.kantoor_id) notFound()

  const fase = (object.fase ?? 'in_verkoop') as ObjectFase
  const geo = object.lat != null && object.lng != null ? { lat: object.lat, lng: object.lng } : null

  // transacties gaat sinds item 2.2 altijd via de sessie-gebonden client
  // (lib/transactiesQuery.ts) i.p.v. de service-client — RLS regelt de
  // kantoorscheiding, geen handmatig .eq('kantoor_id', …) meer nodig.
  // De waarderingskern v2 (item 4.3) haalt haar eigen kandidaten/regionale
  // set op via de server action `berekenWaardering()`, dus deze pagina hoeft
  // niet meer de volle transactiedataset te laden voor de waardering.
  const eigenVerkopen = geo
    ? await haalEigenVerkopen<TransactieMetCoordinaten>(supabase, MET_COORDINATEN_KOLOMMEN, { metCoordinaten: true })
    : []

  const invoer = object.input_json as PropertyInput
  const waarderingOpslag = migreerWaarderingJson(object.waardering_json)
  const waarderingUitkomst = waarderingOpslag.uitkomst
  const waarderingCorrectie = waarderingOpslag.correctie
  const uspsInitieel = (object.usps_structuur as string[] | null) ?? []

  return (
    <AppPagina>
      <Link
        href="/woningen"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#98A0A6', fontSize: 13.5, fontWeight: 600, textDecoration: 'none', marginBottom: 18 }}
      >
        ← Terug naar de portefeuille
      </Link>

      <DossierHeader
        objectId={object.id}
        address={object.address}
        fase={fase}
        faseSinds={object.fase_sinds}
        invoer={invoer}
        status={(object.status ?? 'draft') as 'draft' | 'published' | 'onder_bod' | 'verkocht'}
        aangemaaktOp={object.created_at}
        acties={
          <>
            <RegenereerButton invoer={object.input_json as PropertyInput} />
            <DeleteButton objectId={object.id} adres={object.address} />
          </>
        }
      />

      <InvoerToggle invoer={object.input_json as PropertyInput} />

      <ObjectWorkspace
        objectId={object.id}
        address={object.address}
        fase={fase}
        outputs={object.outputs_json as ContentOutput}
        outputsEn={(object.outputs_json_en as ContentOutput | null) ?? null}
        vraagprijs={(object.input_json as PropertyInput).vraagprijs ?? 0}
        notitie={(object as unknown as { notitie: string | null }).notitie ?? null}
        userEmail={user.email ?? undefined}
        geo={geo}
        eigenVerkopen={eigenVerkopen}
        waarderingUitkomst={waarderingUitkomst}
        waarderingCorrectie={waarderingCorrectie}
        uspsInitieel={uspsInitieel}
        contentStatus={(object.content_status ?? 'klaar') as ObjectContentStatus}
        contentBezigSinds={object.content_bezig_sinds ?? null}
        verrijkingInitieel={verrijkingInitieel}
      />
    </AppPagina>
  )
}
