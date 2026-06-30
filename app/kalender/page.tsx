import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { KalenderClient } from './KalenderClient'

export const metadata = { title: 'Content kalender — VestaAI' }

export default async function KalenderPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Huidige maand ophalen als startpunt
  const nu = new Date()
  const vanDate = new Date(nu.getFullYear(), nu.getMonth(), 1)
  const totDate = new Date(nu.getFullYear(), nu.getMonth() + 2, 0) // einde volgende maand

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id')
    .eq('id', user.id)
    .single()

  if (!makelaar) redirect('/login')

  const { data: planning } = await supabase
    .from('post_planning')
    .select('id, object_id, platform, content, gepland_op, status, notitie')
    .eq('kantoor_id', makelaar.kantoor_id)
    .gte('gepland_op', vanDate.toISOString())
    .lte('gepland_op', totDate.toISOString())
    .order('gepland_op', { ascending: true })

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold text-gray-900">Content kalender</h1>
      </div>
      <KalenderClient initialPlanning={planning ?? []} />
    </main>
  )
}
