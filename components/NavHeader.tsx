import Link from 'next/link'
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { NavLinks } from './NavLinks'

async function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button
        type="submit"
        style={{ fontSize: 14, fontWeight: 600, color: '#5A6B61', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}
      >
        Uitloggen
      </button>
    </form>
  )
}

const PLAN_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  starter: { label: 'Starter', bg: '#F1F7F3', color: '#2A8A5C' },
  pro:     { label: 'Pro',     bg: '#E3F0E8', color: '#1A6B45' },
  kantoor: { label: 'Kantoor', bg: '#D5E8DD', color: '#114230' },
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

  const trialEndsAt = kantoor?.trial_ends_at ? new Date(kantoor.trial_ends_at) : null
  const daysLeft = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const toonTrialBanner = daysLeft !== null && daysLeft <= 3 && daysLeft > 0 && !kantoor?.plan
  const planInfo = kantoor?.plan ? PLAN_LABELS[kantoor.plan] : null

  return (
    <>
      {toonTrialBanner && (
        <div style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A', padding: '8px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#92400E' }}>
            Uw proefperiode verloopt over <strong>{daysLeft} dag{daysLeft === 1 ? '' : 'en'}</strong>.{' '}
            <Link href="/settings" style={{ textDecoration: 'underline', fontWeight: 600, color: '#78350F' }}>
              Kies nu een abonnement →
            </Link>
          </p>
        </div>
      )}

      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(251,252,251,.92)', backdropFilter: 'saturate(150%) blur(14px)', borderBottom: '1px solid #E4EAE6' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Left: logo + nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
              {kantoor?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={kantoor.logo_url} alt={kantoor.name} style={{ height: 30, objectFit: 'contain' }} />
              ) : (
                <>
                  <span style={{ width: 34, height: 34, borderRadius: 10, background: '#1A6B45', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(26,107,69,.28)', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontWeight: 800, fontSize: 19, letterSpacing: '-.04em' }}>V</span>
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-.02em', color: '#0E1A13' }}>
                    Vesta<span style={{ color: '#1A6B45' }}>AI</span>
                  </span>
                </>
              )}
            </Link>
            <NavLinks />
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {planInfo && (
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: planInfo.bg, color: planInfo.color, letterSpacing: '.02em' }}>
                {planInfo.label}
              </span>
            )}
            {user.email === 'quinn.berkouwer@gmail.com' && (
              <Link href="/admin" style={{ fontSize: 13, color: '#9AA6A0', textDecoration: 'none', fontWeight: 500 }}>
                Admin
              </Link>
            )}
            <Link
              href="/settings"
              aria-label="Instellingen"
              style={{ color: '#9AA6A0', display: 'flex', alignItems: 'center' }}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
