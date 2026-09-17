import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { haalEigenVerkopen, haalTransactiesVoorVerkenner, ALLE_TRANSACTIE_KOLOMMEN, MET_COORDINATEN_KOLOMMEN } from '@/lib/transactiesQuery'
import { ObjectWorkspace } from '@/components/ObjectWorkspace'
import { InvoerToggle } from './InvoerToggle'
import { StatusToggle } from './StatusToggle'
import { FaseToggle } from './FaseToggle'
import { DeleteButton } from './DeleteButton'
import { RegenereerButton } from './RegenereerButton'
import { formatDatum } from '@/lib/utils'
import { AppPagina, Eyebrow, SerifTitle } from '@/components/ui'
import type { ContentOutput, ObjectFase, PropertyInput } from '@/lib/schemas'
import type { Subject } from '@/lib/waardering'
import type { TransactieMetCoordinaten, TransactieRow } from '@/lib/supabase'

const getCachedObject = unstable_cache(
  async (objectId: string) => {
    const serviceClient = createServiceSupabaseClient()
    const { data } = await serviceClient
      .from('objecten')
      .select('id, kantoor_id, address, status, fase, input_json, outputs_json, outputs_json_en, created_at, notitie, lat, lng, waardering_json, usps_structuur')
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

  const [object, makelaar] = await Promise.all([
    getCachedObject(params.id),
    supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single().then(r => r.data),
  ])

  if (!object || !makelaar || object.kantoor_id !== makelaar.kantoor_id) notFound()

  // Adres splitsen op de laatste komma → stad cursief in de serif-titel.
  const komma = object.address.lastIndexOf(',')
  const straat = komma > -1 ? object.address.slice(0, komma) : object.address
  const stad = komma > -1 ? object.address.slice(komma + 1).trim() : undefined

  const fase = (object.fase ?? 'in_verkoop') as ObjectFase
  const geo = object.lat != null && object.lng != null ? { lat: object.lat, lng: object.lng } : null

  // transacties gaat sinds item 2.2 altijd via de sessie-gebonden client
  // (lib/transactiesQuery.ts) i.p.v. de service-client — RLS regelt de
  // kantoorscheiding, geen handmatig .eq('kantoor_id', …) meer nodig.
  const [eigenVerkopen, transactieDataset] = await Promise.all([
    geo
      ? haalEigenVerkopen<TransactieMetCoordinaten>(supabase, MET_COORDINATEN_KOLOMMEN, { metCoordinaten: true })
      : Promise.resolve([] as TransactieMetCoordinaten[]),
    // Waardering (F7) draait op de volledige dataset, niet alleen eigen verkopen.
    haalTransactiesVoorVerkenner<TransactieRow>(supabase, ALLE_TRANSACTIE_KOLOMMEN),
  ])

  const invoer = object.input_json as PropertyInput
  const subject: Subject = {
    woningtype: invoer.woningtype,
    oppervlak_m2: invoer.oppervlak_m2,
    bouwjaar: invoer.bouwjaar,
    lat: object.lat,
    lng: object.lng,
  }
  const heeftGarage = !!invoer.ligging_buitenruimte?.garage_parkeren && invoer.ligging_buitenruimte.garage_parkeren !== 'geen'
  const heeftTuin = !!invoer.ligging_buitenruimte?.tuin_m2 && invoer.ligging_buitenruimte.tuin_m2 > 0
  const waarderingCorrectie = (object.waardering_json as { correctie?: { waarde: number; motivatie: string; datum: string } } | null)?.correctie ?? null
  const uspsInitieel = (object.usps_structuur as string[] | null) ?? []

  return (
    <AppPagina>
      <Link
        href="/woningen"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#98A0A6', fontSize: 13.5, fontWeight: 600, textDecoration: 'none', marginBottom: 18 }}
      >
        ← Terug naar de portefeuille
      </Link>

      <div style={{ marginBottom: 24 }}>
        <Eyebrow>Woning</Eyebrow>
        <SerifTitle size={32} accent={stad} style={{ marginBottom: 12 }}>{stad ? `${straat},` : straat}</SerifTitle>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <FaseToggle objectId={object.id} fase={fase} />
            {fase !== 'verkoopadvies' && (
              <StatusToggle objectId={object.id} initialStatus={(object.status ?? 'draft') as 'draft' | 'published' | 'onder_bod' | 'verkocht'} />
            )}
            <span style={{ fontSize: 13, color: '#98A0A6' }}>{formatDatum(object.created_at)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RegenereerButton invoer={object.input_json as PropertyInput} />
            <DeleteButton objectId={object.id} adres={object.address} />
          </div>
        </div>
      </div>

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
        subject={subject}
        heeftGarage={heeftGarage}
        heeftTuin={heeftTuin}
        transactieDataset={transactieDataset}
        waarderingCorrectie={waarderingCorrectie}
        uspsInitieel={uspsInitieel}
      />
    </AppPagina>
  )
}
