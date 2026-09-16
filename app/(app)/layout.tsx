import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { Metadata, Viewport } from 'next'
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import { AppTopbar } from '@/components/AppTopbar'
import { bouwBranding, brandingCssVars, VESTA_MERK } from '@/lib/branding'

type KantoorRij = {
  name: string
  logo_url: string | null
  huisstijl_json: Record<string, unknown> | null
} | null

// Gedeeld door generateMetadata (tabbladtitel + favicon) en AppLayout (kleuren/logo in de
// pagina zelf) — React's cache() dedupt de Supabase-lookup binnen één request, zodat het
// niet twee keer bevraagd wordt voor dezelfde requestcyclus.
const haalMakelaarOp = cache(async (): Promise<{ kantoor: KantoorRij }> => {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { kantoor: null }

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id, kantoren(name, logo_url, huisstijl_json)')
    .eq('id', user.id)
    .single()

  return {
    kantoor: (makelaar?.kantoren as unknown as KantoorRij) ?? null,
  }
})

const haalKantoorOp = async (): Promise<KantoorRij> => (await haalMakelaarOp()).kantoor

// Tabbladtitel en favicon van het kantoor — geen "— VestaAI"-suffix (title.absolute), en
// het favicon van het kantoor i.p.v. het VestaAI-icoon uit de root-metadata.
export async function generateMetadata(): Promise<Metadata> {
  if (!isSupabaseConfigured()) return {}
  const branding = bouwBranding(await haalKantoorOp())
  return {
    // Ook het achtervoegsel van onderliggende pagina's is van het kantoor — anders
    // staat er "Overzicht — VestaAI" in het tabblad van een ander merk.
    title: { default: branding.naam, template: `%s — ${branding.naam}` },
    ...(branding.faviconUrl ? { icons: { icon: branding.faviconUrl } } : {}),
  }
}

// De root-layout zet een groene theme-color voor de publieke site; achter de login is
// de browserbalk van het kantoor. Next resolvet viewport per segment, diepste wint.
export async function generateViewport(): Promise<Viewport> {
  if (!isSupabaseConfigured()) return {}
  const branding = bouwBranding(await haalKantoorOp())
  return { themeColor: branding.primair }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Zonder Supabase-config kunnen we niet authenticeren — render kaal door.
  if (!isSupabaseConfigured()) return <>{children}</>

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Platform-admins gebruiken de app niet als klant → naar het beheer.
  if (isPlatformAdmin(user.email)) redirect('/admin')

  const { kantoor } = await haalMakelaarOp()

  // Vanaf de ingelogde omgeving is de hele app van het kantoor: logo, kleuren, lettertype,
  // vormtaal — en straks ook het waarderingsrapport. Zie lib/branding.ts.
  const branding = bouwBranding(kantoor)

  const watermerk = branding.achtergrondUrl ?? branding.achtergrondSecundairUrl
  const watermerkRechts = branding.achtergrondSecundairUrl ?? branding.achtergrondUrl

  return (
    <div style={{ ...brandingCssVars(branding), minHeight: '100vh', background: '#FAFBFB', fontFamily: 'var(--merk-font-body, var(--font-jakarta))' }}>
      {/* Sfeerbeeld van het kantoor in de zijmarges: alleen daar waar de content-kolom
          ze vrijlaat, zodat het een watermerk blijft en nooit onder tekst komt. */}
      {watermerk && (
        <>
          <style>{`
            .merk-watermerk { display: none; }
            @media (min-width: 1280px) {
              .merk-watermerk {
                display: block; position: fixed; top: 0; bottom: 0; z-index: 0;
                /* Loopt bewust een stuk ónder de content door, zodat het beeld ook op een
                   smaller scherm zichtbaar blijft. De kaarten in het midden zijn wit en
                   dekken het af waar tekst staat. */
                width: calc((100vw - var(--app-breedte)) / 2 + 260px);
                background-size: cover; background-position: center; opacity: .18;
                /* Lichte vervaging: een bord of gezicht in beeld mag nooit scherp genoeg
                   zijn om de aandacht van het werk weg te trekken. */
                filter: blur(2.5px) saturate(.85);
                pointer-events: none;
              }
              .merk-watermerk-links {
                left: 0;
                -webkit-mask-image: linear-gradient(to right, #000 0%, rgba(0,0,0,.8) 45%, rgba(0,0,0,.3) 75%, transparent 100%);
                mask-image: linear-gradient(to right, #000 0%, rgba(0,0,0,.8) 45%, rgba(0,0,0,.3) 75%, transparent 100%);
              }
              .merk-watermerk-rechts {
                right: 0;
                -webkit-mask-image: linear-gradient(to left, #000 0%, rgba(0,0,0,.8) 45%, rgba(0,0,0,.3) 75%, transparent 100%);
                mask-image: linear-gradient(to left, #000 0%, rgba(0,0,0,.8) 45%, rgba(0,0,0,.3) 75%, transparent 100%);
              }
            }
          `}</style>
          <div className="merk-watermerk merk-watermerk-links" style={{ backgroundImage: `url(${watermerk})` }} aria-hidden />
          <div className="merk-watermerk merk-watermerk-rechts" style={{ backgroundImage: `url(${watermerkRechts})` }} aria-hidden />
        </>
      )}

      {(branding.telefoon || branding.email) && (
        <div style={{ position: 'relative', zIndex: 1, background: 'var(--merk)', color: 'var(--merk-op)' }}>
          <div style={{ maxWidth: 'var(--app-breedte)', margin: '0 auto', padding: '0 22px', height: 34, display: 'flex', alignItems: 'center', gap: 18, fontSize: 12.5, fontWeight: 600 }}>
            {branding.telefoon && (
              <a href={`tel:${branding.telefoon.replace(/[^\d+]/g, '')}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                {branding.telefoon}
              </a>
            )}
            {branding.email && (
              <a href={`mailto:${branding.email}`} style={{ color: 'inherit', textDecoration: 'none', opacity: .9 }}>
                {branding.email}
              </a>
            )}
          </div>
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
      <AppTopbar branding={branding} userEmail={user.email ?? null}>
        {branding.primair === VESTA_MERK.primair && !branding.logoUrl && (
          <div style={{ background: 'var(--merk-zacht)', borderBottom: '1px solid var(--merk-rand)', padding: '9px 22px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#2A362D', margin: 0 }}>
              Deze omgeving draait nog op de standaardstijl — huisstijl wordt door VestaAI ingesteld.
            </p>
          </div>
        )}
        {children}
      </AppTopbar>
      </div>
    </div>
  )
}
