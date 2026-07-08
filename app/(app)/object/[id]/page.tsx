import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { ObjectWorkspace } from '@/components/ObjectWorkspace'
import { InvoerToggle } from './InvoerToggle'
import { StatusToggle } from './StatusToggle'
import { DeleteButton } from './DeleteButton'
import { RegenereerButton } from './RegenereerButton'
import { formatDatum } from '@/lib/utils'
import { Eyebrow, SerifTitle } from '@/components/ui'
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

  // Adres splitsen op de laatste komma → stad cursief in de serif-titel.
  const komma = object.address.lastIndexOf(',')
  const straat = komma > -1 ? object.address.slice(0, komma) : object.address
  const stad = komma > -1 ? object.address.slice(komma + 1).trim() : undefined

  return (
    <main style={{ maxWidth: 940, margin: '0 auto', padding: '44px 40px 80px' }}>
      <Link
        href="/dashboard"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#9AA6A0', fontSize: 13.5, fontWeight: 600, textDecoration: 'none', marginBottom: 18 }}
      >
        ← Terug naar objecten
      </Link>

      <div style={{ marginBottom: 24 }}>
        <Eyebrow>Object</Eyebrow>
        <SerifTitle size={32} accent={stad} style={{ marginBottom: 12 }}>{stad ? `${straat},` : straat}</SerifTitle>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <StatusToggle objectId={object.id} initialStatus={(object.status ?? 'draft') as 'draft' | 'published' | 'onder_bod' | 'verkocht'} />
            <span style={{ fontSize: 13, color: '#9AA6A0' }}>{formatDatum(object.created_at)}</span>
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
        outputs={object.outputs_json as ContentOutput}
        vraagprijs={(object.input_json as PropertyInput).vraagprijs ?? 0}
        notitie={(object as unknown as { notitie: string | null }).notitie ?? null}
        userEmail={user.email ?? undefined}
      />
    </main>
  )
}
