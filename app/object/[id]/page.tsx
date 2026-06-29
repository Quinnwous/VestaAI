import { notFound, redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { ResultTabs } from '@/components/ResultTabs'
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
      .select('id, address, status, input_json, outputs_json, created_at')
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

  const object = await getCachedObject(params.id)

  if (!object) notFound()

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-400">{formatDatum(object.created_at)}</p>
            <StatusToggle objectId={object.id} initialStatus={(object.status ?? 'draft') as 'draft' | 'published'} />
          </div>
          <div className="flex items-center gap-4">
              <RegenereerButton invoer={object.input_json as PropertyInput} />
              <DeleteButton objectId={object.id} adres={object.address} />
            </div>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{object.address}</h1>
      </div>

      <InvoerToggle invoer={object.input_json as PropertyInput} />

      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8">
        <ResultTabs
          data={object.outputs_json as ContentOutput}
          objectId={object.id}
          onResetHref="/dashboard"
        />
      </div>
    </main>
  )
}
