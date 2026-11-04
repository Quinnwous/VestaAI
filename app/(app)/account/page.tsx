import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { ProfielSectie } from './ProfielSectie'
import { WachtwoordSectie } from './WachtwoordSectie'
import { AppPagina, Card, PageHeader, colors } from '@/components/ui'

export const metadata = { title: 'Mijn account' }

/**
 * Mijn account (masterplan fase 1.7, zie docs/roadmap.md) — bereikbaar via
 * het profielmenu rechtsboven. Naam en wachtwoord verhuisd hierheen vanuit
 * de kantoorpagina, die sinds 16 sep 2026 verder platform-admin-beheerd is.
 */
export default async function AccountPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('name, email')
    .eq('id', user.id)
    .single()

  if (!makelaar) redirect('/dashboard')

  return (
    <AppPagina>
      <PageHeader eyebrow="Beheer" title="Mijn" accent="account" />
      {/* Twee kaarten met kaartkop, zelfde opbouw als de kantoorpagina. */}
      <div className="vui-kantoor-raster vui-gestaffeld">
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${colors.border}` }}>
            <h2 style={{ fontSize: 15.5, fontWeight: 800, color: colors.text, margin: 0 }}>Profiel</h2>
            <p style={{ fontSize: 12.5, color: colors.muted, margin: '2px 0 0' }}>je naam zoals collega&apos;s hem zien</p>
          </div>
          <div style={{ padding: '18px 22px 22px' }}>
            <ProfielSectie naam={makelaar.name} email={makelaar.email} />
          </div>
        </Card>
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${colors.border}` }}>
            <h2 style={{ fontSize: 15.5, fontWeight: 800, color: colors.text, margin: 0 }}>Wachtwoord</h2>
            <p style={{ fontSize: 12.5, color: colors.muted, margin: '2px 0 0' }}>kies een nieuw wachtwoord</p>
          </div>
          <div style={{ padding: '18px 22px 22px' }}>
            <WachtwoordSectie />
          </div>
        </Card>
      </div>
    </AppPagina>
  )
}
