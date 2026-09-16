import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { bouwBranding } from '@/lib/branding'
import { Eyebrow, SerifTitle } from '@/components/ui'
import { ProfielSectie } from './ProfielSectie'
import { StatistiekenPaneel } from './StatistiekenPaneel'
import { KantoorBanner } from './KantoorBanner'
import type { Kantoor, Makelaar } from '@/lib/supabase'

export const metadata = { title: 'Kantoor' }

/**
 * Read-only kantoorpagina (besluit 16 sep 2026, zie CLAUDE.md § Hoofdstructuur):
 * huisstijl, courtage, kantoorprofiel en team zijn platform-admin-beheerd
 * (VestaAI stelt ze per kantoor in via /admin) — hier alleen ter inzage. De
 * enige actie die overblijft is je eigen naam wijzigen, zie ProfielSectie.
 */
export default async function KantoorPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('id, name, email, kantoor_id')
    .eq('id', user.id)
    .single()
  if (!makelaar) redirect('/login')

  const { data: kantoor } = await supabase
    .from('kantoren')
    .select('id, name, logo_url, huisstijl_json, instellingen_json')
    .eq('id', (makelaar as Makelaar).kantoor_id)
    .single()

  const { data: teamleden } = await supabase
    .from('makelaars')
    .select('id, name, email')
    .eq('kantoor_id', (makelaar as Makelaar).kantoor_id)
    .order('name', { ascending: true })

  const huisstijl = (kantoor as Kantoor | null)?.huisstijl_json ?? null
  const instellingen = (kantoor as Kantoor | null)?.instellingen_json ?? null
  const branding = bouwBranding(kantoor as Kantoor | null)

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '44px 40px 80px' }}>
      {branding.achtergrondUrl && <KantoorBanner url={branding.achtergrondUrl} naam={branding.naam} />}

      <Eyebrow>Beheer</Eyebrow>
      <SerifTitle style={{ marginBottom: 8 }}>
        <span style={{ fontStyle: 'italic', color: 'var(--merk,#1A6B45)' }}>Kantoor</span>
      </SerifTitle>
      <p style={{ fontSize: 14, color: '#5C6470', margin: '0 0 32px', maxWidth: 560 }}>
        Huisstijl, courtage en kantoorprofiel stelt VestaAI voor je in — hieronder zie je waarop je omgeving draait.
      </p>

      <div style={{ display: 'grid', gap: 40 }}>
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Jouw profiel</h2>
          <ProfielSectie naam={(makelaar as Makelaar).name} email={(makelaar as Makelaar).email} />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Kantoor</h2>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 space-y-4 max-w-md text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Naam</p>
              <p className="font-medium text-gray-900">{kantoor?.name ?? '—'}</p>
            </div>
            {instellingen?.profiel?.kenmerken && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Over dit kantoor</p>
                <p className="text-gray-700 whitespace-pre-wrap">{instellingen.profiel.kenmerken}</p>
              </div>
            )}
            {instellingen?.werkgebied?.plaatsen && instellingen.werkgebied.plaatsen.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Werkgebied</p>
                <p className="text-gray-700">{instellingen.werkgebied.plaatsen.join(', ')}</p>
              </div>
            )}
            {instellingen?.courtage && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Courtage (standaard, aanpasbaar per verkoopadvies)</p>
                <p className="text-gray-700">
                  {instellingen.courtage.percentage != null ? `${instellingen.courtage.percentage}%` : '—'}
                  {instellingen.courtage.opstartkosten ? ` + €${instellingen.courtage.opstartkosten} opstartkosten` : ''}
                </p>
              </div>
            )}
            {!instellingen && (
              <p className="text-xs text-gray-400">Courtage, kantoorprofiel en werkgebied zijn nog niet ingesteld — neem contact op met VestaAI.</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Huisstijl</h2>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 max-w-md">
            <div className="flex items-center gap-6 mb-4">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-lg border border-gray-200" style={{ background: huisstijl?.primaire_kleur ?? '#1A6B45' }} />
                <span className="text-xs text-gray-500 font-mono">{huisstijl?.primaire_kleur ?? '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-lg border border-gray-200" style={{ background: huisstijl?.accent_kleur ?? '#2A8A5C' }} />
                <span className="text-xs text-gray-500 font-mono">{huisstijl?.accent_kleur ?? '—'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Lettertype</p>
                <p className="text-gray-900">{huisstijl?.lettertype ?? 'jakarta'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Vormtaal</p>
                <p className="text-gray-900">{huisstijl?.vorm ?? 'zacht'}</p>
              </div>
              {huisstijl?.telefoon && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Telefoon</p>
                  <p className="text-gray-900">{huisstijl.telefoon}</p>
                </div>
              )}
              {huisstijl?.email && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">E-mail</p>
                  <p className="text-gray-900">{huisstijl.email}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-4">Wil je iets aanpassen aan je huisstijl? Neem contact op met VestaAI.</p>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Team ({teamleden?.length ?? 0})</h2>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden max-w-md">
            {(teamleden ?? []).map(lid => (
              <div key={lid.id} className="flex items-center justify-between px-4 py-3 bg-white">
                <div>
                  <p className="text-sm font-medium text-gray-900">{lid.name}</p>
                  <p className="text-xs text-gray-500">{lid.email}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Een nieuwe collega toevoegen? Neem contact op met VestaAI.</p>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Statistieken</h2>
          <StatistiekenPaneel />
        </section>

        <section className="border-t border-gray-100 pt-6">
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-sm text-red-600 hover:text-red-700 transition-colors">
              Uitloggen
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
