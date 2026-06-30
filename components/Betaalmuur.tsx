import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'

interface BetaalmuurProps {
  children: React.ReactNode
  /**
   * 'hard' (default): volledig blok, kinderen worden niet getoond.
   * 'soft': kinderen worden getoond, maar een banner wordt boven geplaatst.
   */
  modus?: 'hard' | 'soft'
}

function UpgradeLinks() {
  return (
    <div className="flex gap-2 flex-wrap">
      <Link
        href="/api/stripe/checkout?plan=starter"
        className="inline-block text-xs rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors"
      >
        Starter — €99/mo
      </Link>
      <Link
        href="/api/stripe/checkout?plan=pro"
        className="inline-block text-xs rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 font-medium hover:border-gray-400 transition-colors"
      >
        Pro — €199/mo
      </Link>
    </div>
  )
}

export async function Betaalmuur({ children, modus = 'hard' }: BetaalmuurProps) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <>{children}</>

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id')
    .eq('id', user.id)
    .single()

  if (!makelaar) return <>{children}</>

  const { data: kantoor } = await supabase
    .from('kantoren')
    .select('plan, trial_ends_at')
    .eq('id', makelaar.kantoor_id)
    .single()

  if (!kantoor) return <>{children}</>

  const trialExpired = kantoor.trial_ends_at
    ? new Date(kantoor.trial_ends_at) < new Date()
    : true

  const toegangGeblokkeerd = trialExpired && !kantoor.plan

  if (!toegangGeblokkeerd) return <>{children}</>

  if (modus === 'soft') {
    return (
      <>
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 mb-1">Proefperiode verlopen</p>
            <p className="text-xs text-amber-800 mb-2">
              Kies een abonnement om nieuwe content te blijven genereren.
            </p>
            <UpgradeLinks />
          </div>
        </div>
        {children}
      </>
    )
  }

  // Harde blokkade
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Proefperiode verlopen</h2>
        <p className="text-gray-500 mb-6">
          Je 14-daagse proefperiode is afgelopen. Kies een abonnement om verder te gaan.
        </p>
        <div className="flex flex-col gap-3 items-center">
          <UpgradeLinks />
        </div>
      </div>
    </div>
  )
}
