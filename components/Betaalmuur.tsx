import { createServerSupabaseClient } from '@/lib/supabase'
import { heeftToegang } from '@/lib/plans'

interface BetaalmuurProps {
  children: React.ReactNode
  /**
   * 'hard' (default): volledig blok, kinderen worden niet getoond.
   * 'soft': kinderen worden getoond, maar een banner wordt boven geplaatst.
   */
  modus?: 'hard' | 'soft'
}

const CONTACT = 'quinn.berkouwer@gmail.com'

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

  // Toegang = actief plan óf lopende gratis-periode. Anders: wachten op activering.
  if (heeftToegang(kantoor.plan, kantoor.trial_ends_at)) return <>{children}</>

  if (modus === 'soft') {
    return (
      <>
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 mb-1">Proefperiode afgelopen</p>
            <p className="text-xs text-amber-800">
              Kies een abonnement om nieuwe objecten te genereren.{' '}
              <a href="/settings" className="underline font-medium">Bekijk abonnementen</a>
            </p>
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
        <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Je proefperiode is afgelopen</h2>
        <p className="text-gray-500 mb-6">
          Kies een abonnement om nieuwe objecten te genereren. Alle eerder gegenereerde content blijft bewaard.
        </p>
        <a
          href="/settings"
          className="inline-block text-sm rounded-lg bg-green-700 px-5 py-2.5 text-white font-semibold hover:bg-green-800 transition-colors"
        >
          Kies een abonnement
        </a>
        <p className="mt-4 text-xs text-gray-400">
          Vragen? <a href={`mailto:${CONTACT}`} className="underline">Neem contact op met VestaAI</a>.
        </p>
      </div>
    </div>
  )
}
