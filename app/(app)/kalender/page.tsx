import Link from 'next/link'
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

  const leeg = (planning ?? []).length === 0

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Content kalender</h1>
        <p className="text-sm text-gray-500 max-w-2xl leading-relaxed">
          Plan je social posts vooruit en houd overzicht. De flow: <strong>genereer content</strong> bij een woning →
          <strong> plan hem in</strong> op een datum → <strong>publiceer</strong> op de dag zelf (kopieer de tekst naar je kanaal).
        </p>
      </div>

      {leeg && (
        <div className="mb-8 rounded-2xl border border-[#D5E8DD] bg-[#F1F7F3] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[#0E3B27] mb-1">Nog niks ingepland</p>
            <p className="text-sm text-[#2A6B4C] max-w-xl leading-relaxed">
              Klik hieronder op een dag om direct een post te plannen — of genereer eerst content bij een woning en plan die in.
            </p>
          </div>
          <Link
            href="/object/new"
            className="shrink-0 inline-block rounded-xl bg-[#1A6B45] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#155839] transition-colors"
          >
            Content genereren →
          </Link>
        </div>
      )}

      <KalenderClient initialPlanning={planning ?? []} />
    </main>
  )
}
