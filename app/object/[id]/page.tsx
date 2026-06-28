import { notFound, redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { ResultTabs } from '@/components/ResultTabs'
import { InvoerToggle } from './InvoerToggle'
import type { ContentOutput, PropertyInput } from '@/lib/schemas'

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: 'Object bekijken — VestaAI' }
}

const getCachedObject = unstable_cache(
  async (objectId: string) => {
    const serviceClient = createServiceSupabaseClient()
    const { data } = await serviceClient
      .from('objecten')
      .select('id, address, input_json, outputs_json, created_at')
      .eq('id', objectId)
      .single()
    return data
  },
  ['object-detail'],
  { revalidate: 86400 },
)

export default async function ObjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const object = await getCachedObject(params.id)

  if (!object) notFound()

  const formatDatum = (iso: string) =>
    new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <p className="text-xs text-gray-400 mb-1">{formatDatum(object.created_at)}</p>
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
