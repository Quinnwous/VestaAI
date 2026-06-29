import Link from 'next/link'
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { NavLinks } from './NavLinks'

async function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button
        type="submit"
        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        Uitloggen
      </button>
    </form>
  )
}

export async function NavHeader() {
  if (!isSupabaseConfigured()) return null

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('name, role, kantoor_id, kantoren(name, logo_url, plan, trial_ends_at)')
    .eq('id', user.id)
    .single()

  const kantoor = makelaar?.kantoren as unknown as {
    name: string
    logo_url: string | null
    plan: string | null
    trial_ends_at: string | null
  } | null

  // Trial-waarschuwing berekenen
  const trialEndsAt = kantoor?.trial_ends_at ? new Date(kantoor.trial_ends_at) : null
  const daysLeft = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const toonTrialBanner = daysLeft !== null && daysLeft <= 3 && daysLeft > 0 && !kantoor?.plan

  return (
    <>
      {toonTrialBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
          <p className="text-xs text-amber-800">
            Je proefperiode verloopt over <strong>{daysLeft} dag{daysLeft === 1 ? '' : 'en'}</strong>.{' '}
            <Link href="/settings" className="underline font-medium hover:text-amber-900">
              Kies nu een abonnement →
            </Link>
          </p>
        </div>
      )}

      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              {kantoor?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={kantoor.logo_url} alt={kantoor.name} className="h-7 object-contain" />
              ) : (
                <span className="text-base font-bold text-gray-900">VestaAI</span>
              )}
            </Link>

            <NavLinks />
          </div>

          <div className="flex items-center gap-4">
            {kantoor?.plan && (
              <span className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                kantoor.plan === 'franchise'
                  ? 'bg-purple-100 text-purple-700'
                  : kantoor.plan === 'kantoor'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {kantoor.plan.charAt(0).toUpperCase() + kantoor.plan.slice(1)}
              </span>
            )}
            <Link
              href="/settings"
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Instellingen"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
    </>
  )
}
