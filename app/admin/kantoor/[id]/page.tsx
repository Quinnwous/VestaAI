import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import { HuisstijlForm } from '../HuisstijlForm'
import { InstellingenForm } from '../InstellingenForm'
import { TeamBeheer } from '../TeamBeheer'
import { VoegTeamlidToe } from '../VoegTeamlidToe'
import type { Kantoor } from '@/lib/supabase'

export const metadata = { title: 'Kantoor beheren — VestaAI' }

/**
 * Kantoor-detailpagina voor de platform-admin: huisstijl, courtage/profiel/
 * werkgebied en teambeheer — alles wat sinds 16 sep 2026 niet meer bij het
 * kantoor zelf staat (zie CLAUDE.md § Hoofdstructuur, "één rol per kantoor").
 */
export default async function AdminKantoorPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isPlatformAdmin(user.email)) redirect('/dashboard')

  const service = createServiceSupabaseClient()
  const [{ data: kantoor }, { data: teamleden }, slugResultaat] = await Promise.all([
    service.from('kantoren').select('id, name, logo_url, huisstijl_json, instellingen_json').eq('id', params.id).single(),
    service.from('makelaars').select('id, name, email').eq('kantoor_id', params.id).order('name', { ascending: true }),
    // Losse query (item 9.1): faalt gracieus (undefined) zolang migratie
    // 20260923_kantoren_slug.sql nog niet is toegepast, zonder de rest van
    // de admin-pagina te breken.
    service.from('kantoren').select('slug').eq('id', params.id).single(),
  ])

  if (!kantoor) notFound()

  const slug: string | null | undefined = slugResultaat.error ? undefined : (slugResultaat.data?.slug ?? null)

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600">← Alle kantoren</Link>
      <h1 className="text-xl font-bold text-gray-900 mt-2 mb-8">{kantoor.name}</h1>

      <section className="mb-12">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Huisstijl</h2>
        <HuisstijlForm kantoor={kantoor as Kantoor} />
      </section>

      <section className="mb-12 border-t border-gray-100 pt-10">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Kantoorinstellingen</h2>
        <InstellingenForm kantoorId={kantoor.id} naam={kantoor.name} slug={slug} instellingen={(kantoor as Kantoor).instellingen_json ?? null} />
      </section>

      <section className="border-t border-gray-100 pt-10">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Team ({teamleden?.length ?? 0})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <TeamBeheer kantoorId={kantoor.id} teamleden={teamleden ?? []} />
          <VoegTeamlidToe kantoorId={kantoor.id} />
        </div>
      </section>
    </main>
  )
}
