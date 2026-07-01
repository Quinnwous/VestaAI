import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id, role')
    .eq('id', user.id)
    .single()
  if (!makelaar) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  const serviceClient = createServiceSupabaseClient()

  const [kantoorResult, referralsResult] = await Promise.all([
    serviceClient
      .from('kantoren')
      .select('referral_code')
      .eq('id', makelaar.kantoor_id)
      .single(),
    serviceClient
      .from('referrals')
      .select('id, reward_applied, created_at')
      .eq('referrer_kantoor_id', makelaar.kantoor_id)
      .order('created_at', { ascending: false }),
  ])

  const referralCode = (kantoorResult.data as { referral_code?: string } | null)?.referral_code ?? null
  const referrals = referralsResult.data ?? []

  return NextResponse.json({
    referral_code: referralCode,
    totaal: referrals.length,
    beloond: referrals.filter(r => r.reward_applied).length,
    recente: referrals.slice(0, 10).map(r => ({
      id: r.id,
      reward_applied: r.reward_applied,
      datum: r.created_at,
    })),
  })
}
