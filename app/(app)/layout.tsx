import { redirect } from 'next/navigation'
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import { AppTopbar } from '@/components/AppTopbar'
import { bouwBranding, brandingCssVars, VESTA_MERK } from '@/lib/branding'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Zonder Supabase-config kunnen we niet authenticeren — render kaal door.
  if (!isSupabaseConfigured()) return <>{children}</>

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Platform-admins gebruiken de app niet als klant → naar het beheer.
  if (isPlatformAdmin(user.email)) redirect('/admin')

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id, kantoren(name, logo_url, huisstijl_json)')
    .eq('id', user.id)
    .single()

  const kantoor = makelaar?.kantoren as unknown as {
    name: string
    logo_url: string | null
    huisstijl_json: Record<string, unknown> | null
  } | null

  // Vanaf de ingelogde omgeving is de hele app van het kantoor: logo, kleuren,
  // en straks ook het waarderingsrapport. Zie lib/branding.ts.
  const branding = bouwBranding(kantoor)

  return (
    <div style={{ ...brandingCssVars(branding), minHeight: '100vh', background: '#FBFCFB' }}>
      <AppTopbar branding={branding} userEmail={user.email ?? null}>
        {branding.primair === VESTA_MERK.primair && !branding.logoUrl && (
          <div style={{ background: 'var(--merk-zacht)', borderBottom: '1px solid var(--merk-rand)', padding: '9px 22px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#2A362D', margin: 0 }}>
              Deze omgeving draait nog op de standaardstijl.{' '}
              <a href="/huisstijl" style={{ color: 'var(--merk)', fontWeight: 700, textDecoration: 'underline' }}>
                Stel uw logo en kleuren in →
              </a>
            </p>
          </div>
        )}
        {children}
      </AppTopbar>
    </div>
  )
}
