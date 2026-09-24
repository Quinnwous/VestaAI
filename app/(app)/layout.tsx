import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { Metadata, Viewport } from 'next'
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import { AppTopbar } from '@/components/AppTopbar'
import { TooltipProvider } from '@/components/ui'
import { bouwBranding, brandingCssVars, brandingRootCss, VESTA_MERK } from '@/lib/branding'

type KantoorRij = {
  name: string
  logo_url: string | null
  huisstijl_json: Record<string, unknown> | null
} | null

// Gedeeld door generateMetadata (tabbladtitel + favicon) en AppLayout (kleuren/logo +
// avatarnaam in de pagina zelf) — React's cache() dedupt de Supabase-lookup binnen één
// request, zodat het niet twee keer bevraagd wordt voor dezelfde requestcyclus.
const haalMakelaarOp = cache(async (): Promise<{ naam: string | null; kantoor: KantoorRij }> => {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { naam: null, kantoor: null }

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('name, kantoor_id, kantoren(name, logo_url, huisstijl_json)')
    .eq('id', user.id)
    .single()

  return {
    naam: makelaar?.name ?? null,
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

  const { naam, kantoor } = await haalMakelaarOp()

  // Vanaf de ingelogde omgeving is de hele app van het kantoor: logo, kleuren, lettertype,
  // vormtaal — en straks ook het waarderingsrapport. Zie lib/branding.ts.
  const branding = bouwBranding(kantoor)

  return (
    <div style={{ ...brandingCssVars(branding), minHeight: '100vh', background: '#FAFBFB', fontFamily: 'var(--merk-font-body, var(--font-jakarta))' }}>
      {/* Ook op :root, zodat Radix-portals (in <body>, buiten deze div) de kantoorkleuren erven. */}
      <style dangerouslySetInnerHTML={{ __html: brandingRootCss(branding) }} />
      {/* Contactbalk (telefoon/e-mail) verwijderd — masterplan fase 1.2, 16-17 sep 2026,
          zie docs/roadmap.md. branding.telefoon/branding.email blijven bestaan voor
          gebruik in pdf's en e-mails. */}
      <div style={{ position: 'relative', zIndex: 1 }}>
      {/* Eén TooltipProvider voor de hele ingelogde omgeving (item 6.0): Radix
          deelt hierin de open/dicht-vertraging, zodat je bij het langsgaan van
          een rij knoppen niet elke tooltip opnieuw moet "verdienen". */}
      <TooltipProvider>
      <AppTopbar branding={branding} gebruiker={{ naam, email: user.email ?? null }}>
        {branding.primair === VESTA_MERK.primair && !branding.logoUrl && (
          <div style={{ background: 'var(--merk-zacht)', borderBottom: '1px solid var(--merk-rand)', padding: '9px var(--app-marge)', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#2A362D', margin: 0 }}>
              Deze omgeving draait nog op de standaardstijl — huisstijl wordt door VestaAI ingesteld.
            </p>
          </div>
        )}
        {children}
      </AppTopbar>
      </TooltipProvider>
      </div>
    </div>
  )
}
