import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function Betaalmuur({ children }: { children: React.ReactNode }) {
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

  if (trialExpired && !kantoor.plan) {
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
          <div className="flex flex-col gap-3">
            <Link
              href="/api/stripe/checkout?plan=solo"
              className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Solo — €79/maand
            </Link>
            <Link
              href="/api/stripe/checkout?plan=kantoor"
              className="inline-block rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
            >
              Kantoor — €149/maand (5 gebruikers)
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
