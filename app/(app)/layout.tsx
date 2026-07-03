import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import { AppShell } from '@/components/AppShell'

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
    .select('kantoor_id, kantoren(name, logo_url, plan, trial_ends_at)')
    .eq('id', user.id)
    .single()

  const kantoor = makelaar?.kantoren as unknown as {
    name: string
    logo_url: string | null
    plan: string | null
    trial_ends_at: string | null
  } | null

  const trialEndsAt = kantoor?.trial_ends_at ? new Date(kantoor.trial_ends_at) : null
  const daysLeft = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const toonTrialBanner = daysLeft !== null && daysLeft <= 3 && daysLeft > 0 && !kantoor?.plan

  return (
    <AppShell
      kantoorNaam={kantoor?.name ?? null}
      logoUrl={kantoor?.logo_url ?? null}
      plan={kantoor?.plan ?? null}
      userEmail={user.email ?? null}
    >
      {toonTrialBanner && (
        <div style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A', padding: '8px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#92400E' }}>
            Uw proefperiode verloopt over <strong>{daysLeft} dag{daysLeft === 1 ? '' : 'en'}</strong>.{' '}
            <Link href="/prijzen" style={{ textDecoration: 'underline', fontWeight: 600, color: '#78350F' }}>
              Kies nu een abonnement →
            </Link>
          </p>
        </div>
      )}
      {children}
    </AppShell>
  )
}
