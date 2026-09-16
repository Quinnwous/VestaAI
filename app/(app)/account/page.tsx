import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { ProfielSectie } from './ProfielSectie'
import { WachtwoordSectie } from './WachtwoordSectie'
import { AppPagina, PageHeader } from '@/components/ui'

export const metadata = { title: 'Mijn account' }

/**
 * Mijn account (masterplan fase 1.7, zie docs/roadmap.md) — bereikbaar via
 * het profielmenu rechtsboven. Naam en wachtwoord verhuisd hierheen vanuit
 * de kantoorpagina, die sinds 16 sep 2026 verder platform-admin-beheerd is.
 */
export default async function AccountPage() {
  const supabase = createServerSupabaseClient()
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
      <div style={{ display: 'grid', gap: 32 }}>
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#5C6470', margin: '0 0 12px' }}>Profiel</h2>
          <ProfielSectie naam={makelaar.name} email={makelaar.email} />
        </section>
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#5C6470', margin: '0 0 12px' }}>Wachtwoord</h2>
          <WachtwoordSectie />
        </section>
      </div>
    </AppPagina>
  )
}
