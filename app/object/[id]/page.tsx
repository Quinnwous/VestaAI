import { notFound, redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { ResultTabs } from '@/components/ResultTabs'
import { PrijswijzigingModal } from '@/components/PrijswijzigingModal'
import { DocumentenAssistent } from '@/components/DocumentenAssistent'
import { FotoVerbetering } from '@/components/FotoVerbetering'
import { VirtualStaging } from '@/components/VirtualStaging'
import { NotitieVeld } from '@/components/NotitieVeld'
import { InvoerToggle } from './InvoerToggle'
import { StatusToggle } from './StatusToggle'
import { DeleteButton } from './DeleteButton'
import { RegenereerButton } from './RegenereerButton'
import { formatDatum } from '@/lib/utils'
import type { ContentOutput, PropertyInput } from '@/lib/schemas'

const getCachedObject = unstable_cache(
  async (objectId: string) => {
    const serviceClient = createServiceSupabaseClient()
    const { data } = await serviceClient
      .from('objecten')
      .select('id, kantoor_id, address, status, input_json, outputs_json, created_at, notitie')
      .eq('id', objectId)
      .single()
    return data
  },
  ['object-detail'],
  { revalidate: 86400 },
)

export async function generateMetadata({ params }: { params: { id: string } }) {
  const object = await getCachedObject(params.id)
  if (!object) return { title: 'Object niet gevonden — VestaAI' }
  return {
    title: `${object.address} — VestaAI`,
    description: `Content-suite voor ${object.address}`,
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

  const card: React.CSSProperties = {
    borderRadius: 20,
    background: '#fff',
    border: '1px solid #E9EFEB',
    padding: '28px 28px',
    boxShadow: '0 2px 16px rgba(14,26,19,.05)',
    marginBottom: 16,
  }

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '40px 28px 80px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <p style={{ fontSize: 13, color: '#9AA6A0' }}>{formatDatum(object.created_at)}</p>
            <StatusToggle objectId={object.id} initialStatus={(object.status ?? 'draft') as 'draft' | 'published' | 'onder_bod' | 'verkocht'} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PrijswijzigingModal
              objectId={object.id}
              adres={object.address}
              huidigeprijs={(object.input_json as PropertyInput).vraagprijs ?? 0}
            />
            <RegenereerButton invoer={object.input_json as PropertyInput} />
            <DeleteButton objectId={object.id} adres={object.address} />
          </div>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0E1A13' }}>{object.address}</h1>
      </div>

      <InvoerToggle invoer={object.input_json as PropertyInput} />

      <div style={card}>
        <ResultTabs
          data={object.outputs_json as ContentOutput}
          objectId={object.id}
          onResetHref="/dashboard"
        />
      </div>

      <NotitieVeld
        objectId={object.id}
        initieleNotitie={(object as unknown as { notitie: string | null }).notitie ?? null}
      />

      {/* Foto-tools */}
      <div style={card}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13', marginBottom: 4 }}>Foto verbeteren</h2>
          <p style={{ fontSize: 13, color: '#9AA6A0', marginBottom: 16 }}>Upload een woning- of kamerfoto en ontvang een verbeterde versie (belichting, scherpte, perspectief).</p>
          <FotoVerbetering objectId={object.id} />
        </div>
        <div style={{ borderTop: '1px solid #E9EFEB', paddingTop: 24, marginTop: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13', marginBottom: 4 }}>Virtual staging</h2>
          <p style={{ fontSize: 13, color: '#9AA6A0', marginBottom: 16 }}>Upload een lege kamer en ontvang een gemeubileerde versie via AI.</p>
          <VirtualStaging />
        </div>
      </div>

      {/* Juridisch documenten assistent */}
      <div style={{ ...card, marginBottom: 0 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13', marginBottom: 4 }}>Juridisch documenten assistent</h2>
        <p style={{ fontSize: 13, color: '#9AA6A0', marginBottom: 16 }}>Upload een VVE-notulen, leveringsakte of koopakte en stel er vragen over via AI.</p>
        <DocumentenAssistent objectId={object.id} />
      </div>
    </main>
  )
}
